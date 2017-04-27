# React Native Bundle Splitter

Split config: [splitconfig](./split-example/.splitconfig).

## WIP 

Now only have Android Example.

## Project Structure

```
/root
 |- /src
   |- /components
     |- /packagea
       |- SampleA.js      => Entry1
       |- ApiOfSampleA.js => Refered in SampleA.js
     |- /packageb
       |- SampleB         => Entry2
       |- ApiOfSampleA.js => Refered in SampleA.js
   |- /modules 
     |- index.js      => Append to base
     |- ModuleA.js    => Refered in index.js
     |- ModuleB.js    => Refered in index.js
 |- base.js          => Entry of base
 |- resolveInject.js => Resolve splitted resource
```

## Usage

```
npm install
node ../index.js --platform android --output build --config .splitconfig --dev false
```
See example [run-example.sh](./split-example/run-example.sh).

## Run Example

```
cd split-example
npm install
./run-example.sh
```

