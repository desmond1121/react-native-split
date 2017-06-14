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


'use strict';
const fs = require('fs');
const path = require('path');
const MODULE_REGEX = /require\s?\(([0-9]+)[^)]*\)/g;
const EXPR_STMT = 'ExpressionStatement';
const EMPTY_STMT = 'EmptyStatement';
const IF_STMT = 'IfStatement';

const BINARY_EXPR = 'BinaryExpression';
const LOGICAL_EXPR = 'LogicalExpression';
const UNARY_EXPR = 'UnaryExpression';
const CALL_EXPR = 'CallExpression';
const FUNC_EXPR = 'FunctionExpression';
const COND_EXPR = 'ConditionalExpression';
const IDENTIFIER = 'Identifier';
const LITERAL_NUM = 'NumericLiteral';
const LITERAL_STR = 'StringLiteral';

import type {Config} from '../flow/types';

const DEFAULT_ASSET_EXTS =  [
  'bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp', // Image formats
  'm4v', 'mov', 'mp4', 'mpeg', 'mpg', 'webm', // Video formats
  'aac', 'aiff', 'caf', 'm4a', 'mp3', 'wav', // Audio formats
  'html', 'pdf', // Document formats
];

export function isReactNativeEntry(moduleName : string) : boolean {
  return moduleName === 'react-native-implementation' ||
         moduleName === 'react-native/Libraries/react-native/react-native.js';
}

export function isAssetModule(moduleName : string) : boolean {
  let ext = moduleName.substring(moduleName.lastIndexOf('.') + 1);
  return DEFAULT_ASSET_EXTS.indexOf(ext) > 0;
}

export function isEmptyStmt(node : any) : boolean {
  try {
    return node.type === EMPTY_STMT;
  } catch (e) {
    return false;
  }
}

export function getAssetConfig(node: any) : any {
  const func = node.expression.arguments[0];
  const rhs = func.body.body[0].expression.right; //require(240).registerAsset({...})
  const propNode = rhs.arguments[0].properties; // {...}
  const assetConfig = {
    code: {
      start : rhs.arguments[0].start,
      end: rhs.arguments[0].end
    }
  };
  propNode.forEach(prop => {
    let key = prop.key.value ? prop.key.value : prop.key.name;
    if (key === 'scales') {
      let value = [];
      prop.value.elements.forEach(scaleNode => {
        value.push(scaleNode.value);
      });
      assetConfig[key] = value;
    } else {
      assetConfig[key] = prop.value.value;
    }
  });
  return assetConfig;
}

export function isModuleCall(node : any) : boolean {
  try {
    return node.type === EXPR_STMT
      && node.expression.type === CALL_EXPR
      && node.expression.callee.type === IDENTIFIER
      && node.expression.callee.name === 'require'
      && node.expression.arguments.length === 1
      && node.expression.arguments[0].type === LITERAL_NUM;
  } catch (e) {
    return false;
  }
}

export function isRequirePolyfillCondition(node: any, dev: boolean) : boolean {
  if (node.type === IF_STMT
    && node.test.type === LOGICAL_EXPR
    && node.test.left.name === '__DEV__'
    && node.test.operator === '&&'
    && node.test.right.type === BINARY_EXPR) {
    let binaryExpr = node.test.right;
    if (dev) {
      return binaryExpr.left.operator === 'typeof'
        && binaryExpr.operator === '==='
        && binaryExpr.right.type === LITERAL_STR;
    } else {
      return binaryExpr.left.type === LITERAL_STR
      && binaryExpr.operator === '=='
      && binaryExpr.right.operator === 'typeof';
    }
  }
}

export function isPolyfillCall(node : any, dev : boolean) : boolean {
  try {
    let isPolyfillCallExpr = (expr: any) => {
      return expr.type === CALL_EXPR
        && expr.callee.type === FUNC_EXPR
        && expr.callee.params.length === 1
        && expr.callee.params[0].type === IDENTIFIER
        && expr.arguments.length === 1
        && expr.arguments[0].type === COND_EXPR;
    };
    if (dev) {
      return node.type === EXPR_STMT && isPolyfillCallExpr(node.expression);
    } else {
      return node.type === EXPR_STMT
        && node.expression.type === UNARY_EXPR
        && isPolyfillCallExpr(node.expression.argument);
    }
  } catch (e) {
    return false;
  }
}

export function isModuleDeclaration(node : any) : boolean {
  try {
    return node.type === EXPR_STMT
      && node.expression.type === CALL_EXPR
      && node.expression.callee.type === IDENTIFIER
      && node.expression.callee.name === '__d';
  } catch (e) {
    return false;
  }
}

export function replaceModuleIdWithName(codeBlob : string, modules : any) : string {
  let dependencies = getModuleDependencyCodeRange(codeBlob, 0, codeBlob.length);
  if (dependencies) {
    dependencies.forEach(deps => {
      let moduleName = modules[deps.module].name;
      codeBlob = codeBlob.replace(deps.code, 'require(\"' + moduleName + '\")');
    });
  }
  return codeBlob;
}

export function getModuleDependency(codeBlob : string, start : number, end : number) : Array<number> {
  const dependency = [];
  const bodyString = codeBlob.substring(start, end);
  let result;
  while(result = MODULE_REGEX.exec(bodyString)) {
    dependency.push(parseInt(result[1]));
  }
  return dependency;
}

export function getModuleDependencyCodeRange(codeBlob : string, start : number, end : number) : Array<any> {
  const dependency = [];
  const bodyString = codeBlob.substring(start, end);
  let result;
  while(result = MODULE_REGEX.exec(bodyString)) {
    dependency.push({
      code: result[0],
      module: parseInt(result[1])
    });
  }
  return dependency;
}

export function ensureFolder(dir : string) {
  try {
    fs.accessSync(dir, fs.F_OK);
    return true;
  } catch (e) {
    fs.mkdirSync(dir);
    return false;
  }
}

/**
 * 递归创建目录 同步方法
 */
export function mkdirsSync(dirname) {  
    //console.log(dirname);  
    if (fs.existsSync(dirname)) {  
        return true;  
    } else {  
        if (mkdirsSync(path.dirname(dirname))) {  
            fs.mkdirSync(dirname);  
            return true;  
        }  
    }  
}

// export function resolvePathArrays(root: string, array : Array<any>, val ?: string) : Array<any> {
//   const newArr = [];
//   array.forEach(item => {
//     if (val) {
//       let newItem = Object.assign({}, item);
//       newItem[val] = path.resolve(root, item[val]);
//       newArr.push(newItem);
//     } else if (typeof item === 'string') {
//       newArr.push(path.resolve(root, item));
//     }
//   });
//   return newArr;
// }


