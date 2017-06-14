/**
 * Copyright 2015-present Desmond Yao
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Created by desmond on 4/16/17.
 * @flow
 */

const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const path = require('path');
const minimatch = require('minimatch');
const Util = require('./utils');
const fs = require('fs');
const assetPathUtil = require('./assetPathUtils');

const MODULE_SPLITER = '\n';

import type { Config } from '../flow/types';

export type Asset = {
  moduleId: number,
  httpServerLocation: string,
  width: number,
  height: number,
  scales: Array<number>,
  name: string,
  type: string,
  hash: string,
  code: CodeRange
};

type CustomEntry = {
  moduleId: number,
  name: string,
  moduleSet: Set<number>
};

type CodeRange = {
  start : number,
  end : number
};

type Module = {
  id: number,
  name: string,
  dependencies: Array<string>,
  code: CodeRange,
  idCodeRange: CodeRange,
  isAsset ?: boolean,
  assetConfig ?: Asset
};

type SubBundle = {
  name: string,
  codes : Array<string>,
  assetRenames: Array<AssetRename>
}

type AssetRename = {
  originPath: string,
  relativePath: string,
  newPath: string
};

class Parser {
  _codeBlob: string;
  _config: Config;
  _useCustomSplit: boolean;
  _polyfills: Array<CodeRange>;
  _moduleCalls: Array<CodeRange>;
  _base: Set<number>;
  _customEntries: Array<CustomEntry>;
  _baseEntryIndexModule: number;
  _bundles: Array<SubBundle>;
  _modules: { [number] : Module };
  
  constructor(codeBlob : string, config : Config) {
    this._codeBlob = codeBlob;
    this._config = config;
    this._useCustomSplit = typeof config.customEntries !== 'undefined';
    this._modules = {};
  
    this._polyfills = []; // polyfill codes range, always append on start.
    this._moduleCalls = []; // module call codes range, always append on end.
    
    this._base = new Set(); // store module id of base modules
    this._customEntries = [];
    this._bundles = []; // store split codes
  }
  
  splitBundle() {
    const outputDir = this._config.outputDir;
    Util.ensureFolder(outputDir);
    const bundleAST = babylon.parse(this._codeBlob, {
      sourceType: 'script',
      plugins: ['jsx', 'flow']
    });
    this._parseAST(bundleAST);
    this._doSplit();
    
    this._bundles.forEach(subBundle => {
      console.log('====== Split ' + subBundle.name + ' ======');
      const code = subBundle.codes.join(MODULE_SPLITER);
      const subBundlePath = path.resolve(outputDir, subBundle.name);
      Util.ensureFolder(subBundlePath);
      
      const codePath = path.resolve(subBundlePath, 'index.bundle');
      fs.writeFileSync(codePath, code);
      console.log('[Code] Write code to ' + codePath);
      if (subBundle.assetRenames) {
        subBundle.assetRenames.forEach(item => {
          const assetNewDir = path.dirname(item.newPath);
          Util.mkdirsSync(assetNewDir);
          console.log('[Resource] Move resource ' + item.originPath + ' to ' + item.newPath);
          fs.createReadStream(item.originPath).pipe(fs.createWriteStream(item.newPath));
        });
      }
      console.log('====== Split ' + subBundle.name + ' done! ======');
    });
  }
  
  _parseAST(bundleAST : any) {
    const program = bundleAST.program;
    const body = program.body;
    const customBase = [];
    const customEntry = [];
    let reactEntryModule = undefined;
    let moduleCount = 0;
    body.forEach(node => {
      if (Util.isEmptyStmt(node)) {
        return;
      }
      
      let {start, end} = node;
      
      if (Util.isPolyfillCall(node, this._config.dev)) { // push polyfill codes to base.
        this._polyfills.push({start, end});
      } else if (Util.isModuleCall(node)) {
        this._moduleCalls.push({start, end});
      } else if (Util.isModuleDeclaration(node)) {
        moduleCount++;
        const args = node.expression.arguments;
        const moduleId = parseInt(args[1].value);
        const moduleName = args[3].value;
        const module : Module = {
          id: moduleId,
          name: moduleName,
          dependencies: this._getModuleDependency(args[0].body),
          code: {start, end},
          idCodeRange: {
            start: args[1].start - node.start,
            end: args[1].end - node.start
          }
        };
        
        if (Util.isAssetModule(moduleName)) {
          module.isAsset = true;
          module.assetConfig = Object.assign({}, Util.getAssetConfig(node), { moduleId });
          console.log('Get asset module ' + moduleName, module.assetConfig);
        }

        if (!reactEntryModule && Util.isReactNativeEntry(moduleName)) {
          // get react native entry, then init base set.
          reactEntryModule = moduleId;
        }
        
        if (this._isBaseEntryModule(module)) {
          console.log('Get base entry module: ' + moduleName);
          this._baseEntryIndexModule = moduleId;
        } else if (this._isCustomBaseModule(module)) {
          console.log('Get custom base ' + moduleName);
          customBase.push(moduleId);
        } else if (this._useCustomSplit) {
          let entry = this._isCustomEntryModule(module);
          if (!!entry) {
            console.log('Get custom entry ' + moduleName);
            customEntry.push({
              id: moduleId,
              name: entry.name
            });
          }
        }
  
        this._modules[moduleId] = module;
        console.log('Module ' + moduleName + '(' + moduleId + ') dependency:' + JSON.stringify(module.dependencies));
      } else {
        console.log(require('util').inspect(node, false, null));
        console.log('Cannot parse node!', this._codeBlob.substring(node.start, node.end));
      }
    });
    
    // generate react-native based module firstly.
    if (reactEntryModule) {
      this._genBaseModules(reactEntryModule);
    } else {
      console.warn('Cannot find react-native entry module! You should require(\'react-native\') at some entry.');
    }
    
    // append custom base modules.
    customBase.forEach(base => {
      this._genBaseModules(base);
    });
    
    if (typeof this._baseEntryIndexModule !== 'undefined') {
      let module = this._modules[this._baseEntryIndexModule];
      let dependency = module.dependencies;
      for (let i = dependency.length - 1; i >= 0; i--) {
        if (!!customEntry.find(item => item.id === dependency[i])) {
          dependency.splice(i, 1);
        }
      }
      this._genBaseModules(this._baseEntryIndexModule);
    }
    
    if (!!customEntry) {
      // after gen base module, generate custom entry sets.
      customEntry.forEach(entry => {
        this._genCustomEntryModules(entry.name, entry.id);
      });
    }
    
    // console.log('Get polyfills', this._polyfills);
    console.log('Total modules :' + moduleCount);
    console.log('Base modules size: ' + this._base.size);
  }
  
  _genBaseModules(moduleId : number) {
    this._base.add(moduleId);
    const module = this._modules[moduleId];
    const queue = module.dependencies;
    
    if (!queue) {
      return;
    }
    let added = 0;
    while(queue.length > 0) {
      const tmp = queue.shift();

      if (this._base.has(tmp)) {
        continue;
      }
      
      if (this._modules[tmp].dependencies &&
          this._modules[tmp].dependencies.length > 0) {
        this._modules[tmp].dependencies.forEach(dep => {
          if (!this._base.has(dep)) {
            queue.push(dep);
          }
        });
      }
      added++;
      this._base.add(tmp);
    }
    console.log('Module ' + module.name + ' added to base (' + added + ' more dependency added too)');
  }
  
  _genCustomEntryModules(name : string, moduleId : string) {
    const set = new Set();
    set.add(moduleId);
    
    const module = this._modules[moduleId];
    const queue = module.dependencies;
    
    if (!queue) {
      return;
    }
    let added = 0;
    while(queue.length > 0) {
      const tmp = queue.shift();
      
      if (set.has(tmp) || this._base.has(tmp)) {
        continue;
      }
      
      const dependency = this._modules[tmp].dependencies;
      if (dependency && dependency.length > 0) {
        dependency.forEach(dep => {
          if (!this._base.has(dep) && !set.has(dep)) {
            queue.push(dep);
          }
        });
      }
      added++;
      set.add(tmp);
    }
    this._customEntries.push({
      moduleId,
      name,
      moduleSet: set
    });
    console.log('Module ' + module.name + ' added to bundle ' + name + '. (' + added + ' more dependency added too)');
  }
  
  _getModuleDependency(bodyNode: any) {
    if (bodyNode.type === 'BlockStatement') {
      let {start, end} = bodyNode;
      return Util.getModuleDependency(this._codeBlob, start, end);
    }
    return [];
  }
  
  _isBaseEntryModule(module: Module) {
    let baseIndex = this._config.baseEntry.index;
    let indexGlob =  path.join(this._config.packageName, baseIndex + '.tmp');
    // base index entry.
    return minimatch(module.name, indexGlob);
  }
  
  _isCustomEntryModule(module: Module) {
    return this._config.customEntries.find(entry => {
      const pathGlob = path.join(this._config.packageName, entry.index);
      return minimatch(module.name, pathGlob);
    });
  }
  
  _isCustomBaseModule(module: Module) {
    if (this._config.baseEntry.includes && this._config.baseEntry.includes.length > 0) {
      const includes = this._config.baseEntry.includes;
      const match = includes.find(glob => {
        const pathGlob = path.join(this._config.packageName, glob);
        return minimatch(module.name, pathGlob);
      });
      return typeof match !== 'undefined';
    }
    return false;
  }
  
  _getAssetRenames(asset : Asset,
                   bundle : string) : Array<AssetRename> {
    const assetRenames = [];
    if (this._config.platform === 'android') {
      console.log('Get asset renames', asset);
      assetPathUtil.getAssetPathInDrawableFolder(asset).forEach(
        (relativePath) => {
          assetRenames.push({
            originPath: path.resolve(this._config.bundleDir, relativePath),
            relativePath: relativePath,
            newPath: path.resolve(this._config.outputDir, bundle, relativePath)
          });
        }
      )
    } else {
      console.log('Get ios asset renames', asset);
      asset.scales.forEach(scale => {
        const relativePath = this._getAssetDestPathIOS(asset, scale);
        const originPath = path.resolve(this._config.bundleDir, relativePath);
        if(Util.ensureFolder(originPath)) {
          assetRenames.push({
            originPath,
            relativePath: relativePath,
            newPath: path.resolve(this._config.outputDir, bundle, relativePath)
          });
        }
      });
    }
    
    return assetRenames;
  }

  _getAssetDestPathIOS(asset, scale) {
    const suffix = scale === 1 ? '' : '@' + scale + 'x';
    const fileName = asset.name + suffix + '.' + asset.type;
    return path.join(asset.httpServerLocation.substr(1), fileName);
  }
  
  _doSplit() {
    this._splitBase();
    
    if (this._useCustomSplit) {
      this._customEntries.forEach(entry => {
        this._splitCustomEntry(entry);
      });
      console.log('Use custom split');
    } else {
      this._splitNonBaseModules();
    }
  }
  
  _splitBase() {
    const bundleName = 'base';
    const dev = this._config.dev;
    let codes = [];
    let assetRenames = [];
    // append codes to base
    this._polyfills.forEach((range, index) => {
      let code = this._codeBlob.substring(range.start, range.end);
      if (index === 1) {
        let requireAST = babylon.parse(code);
        let conditionNode;
        traverse(requireAST, {
          enter(path) {
            if (Util.isRequirePolyfillCondition(path.node, dev)) {
              conditionNode = path.node;
            }
          },
          exit(path) { }
        });
        if (conditionNode) {
          code = code.substring(0, conditionNode.start)
            + code.substring(conditionNode.end);
        }
      }
      codes.push(code);
    });
    this._base.forEach(moduleId => {
      const module : Module = this._modules[moduleId];
      let code = this._codeBlob.substring(module.code.start, module.code.end);
      code = code.substring(0, module.idCodeRange.start) +
          '\"' + module.name + '\"'
          + code.substring(module.idCodeRange.end);
      if (module.isAsset && !!module.assetConfig) {
        assetRenames = this._getAssetRenames(module.assetConfig, bundleName);
        code = this._addBundleToAsset(module, bundleName, code);
      } else if (moduleId === this._baseEntryIndexModule) {
        let dependencies = Util.getModuleDependencyCodeRange(code, 0, code.length);
        for (let i = dependencies.length - 1; i >= 0; i--) {
          if (this._customEntries.find(entry => parseInt(entry.moduleId) === parseInt(dependencies[i].module))) {
            code = code.replace(dependencies[i].code, '');
          }
        }
      }
      code = Util.replaceModuleIdWithName(code, this._modules);
      codes.push(code);
    });
    this._moduleCalls.forEach(moduleCall => {
      let code = this._codeBlob.substring(moduleCall.start, moduleCall.end);
      code = Util.replaceModuleIdWithName(code, this._modules);
      codes.push(code);
    });
    this._bundles.push({
      name: bundleName,
      codes,
      assetRenames
    });
  }
  
  _splitCustomEntry(entry : CustomEntry) {
    const bundleName = entry.name;
    let codes = [];
    let assetRenames = [];
    entry.moduleSet.forEach(moduleId => {
      const module : Module = this._modules[moduleId];
      let code = this._codeBlob.substring(module.code.start, module.code.end);
      code = code.substring(0, module.idCodeRange.start) +
        '\"' + module.name + '\"'
        + code.substring(module.idCodeRange.end);
      if (module.isAsset && module.assetConfig) {
        assetRenames = assetRenames.concat(this._getAssetRenames(module.assetConfig, bundleName));
        code = this._addBundleToAsset(module, bundleName, code);
      }
      code = Util.replaceModuleIdWithName(code, this._modules);
      codes.push(code);
    });
    let entryModuleName = this._modules[entry.moduleId].name;
    codes.push('\nrequire(\"' + entryModuleName + '\");');
    this._bundles.push({
      name: bundleName,
      codes,
      assetRenames
    });
  }
  
  _splitNonBaseModules() {
    const bundleName = 'business';
    let codes = [];
    let assetRenames = [];
    for (let moduleId in this._modules) {
      let moduleIdInt = parseInt(moduleId);
      
      if (this._modules.hasOwnProperty(moduleId) && !this._base.has(moduleIdInt)) {
        const module : Module = this._modules[moduleIdInt];
        let code = this._codeBlob.substring(module.code.start, module.code.end);
        code = code.substring(0, module.idCodeRange.start) +
          '\"' + module.name + '\"'
          + code.substring(module.idCodeRange.end);
        if (module.isAsset && module.assetConfig) {
          assetRenames = this._getAssetRenames(module.assetConfig, bundleName);
          code = this._addBundleToAsset(module, bundleName, code);
        }
        code = Util.replaceModuleIdWithName(code, this._modules)
        codes.push(code);
      }
    }
    this._bundles.push({
      name: bundleName,
      codes,
      assetRenames
    });
  }
  
  _addBundleToAsset(module : Module, bundleName : string, code : string) : string {
    const asset : Asset = module.assetConfig;
    let startInner = asset.code.start - module.code.start;
    let endInner = asset.code.end - module.code.start;
    return code.substring(0, startInner) + JSON.stringify({
        httpServerLocation: asset.httpServerLocation,
        width: asset.width,
        height: asset.height,
        scales: asset.scales,
        hash: asset.hash,
        name: asset.name,
        type: asset.type,
        bundle: bundleName
      }) + code.substring(endInner);
  }
}


module.exports = Parser;
