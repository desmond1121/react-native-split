/**
 * Created by desmond on 4/16/17.
 */
'use strict';

type BaseEntry = {
  index: string,
  includes: Array<string>
}

type CustomEntry = {
  id: number,
  name: string,
  inject: boolean,
  index: string
}

export type Config = {
  root: string,
  dev: boolean,
  platform: string,
  packageName: string,
  outputDir: string,
  bundleDir: string,
  baseEntry: BaseEntry,
  customEntries: Array<CustomEntry>
};