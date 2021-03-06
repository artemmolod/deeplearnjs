/* Copyright 2017 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import * as conv_util from '../../src/math/conv_util';
import {Array3D, Array4D, initializeGPU} from '../../src/math/ndarray';
import {Conv2DTransposeProgram} from '../../src/math/webgl/conv_backprop_gpu';
import {GPGPUContext} from '../../src/math/webgl/gpgpu_context';
import * as gpgpu_math from '../../src/math/webgl/gpgpu_math';
import {TextureManager} from '../../src/math/webgl/texture_manager';
import {BenchmarkTest} from './benchmark';

const OP_RUNS = 40;

export const BENCHMARK_TEST: BenchmarkTest = (size: number) => {
  const origInputDepth = 1;
  const origOutputDepth = 2;
  const xShape: [number, number, number] = [size, size, 1];
  const fieldSize = 11;
  const origStride = 1;
  const origPad = 1;

  const gpgpu = new GPGPUContext();
  const texManager = new TextureManager(gpgpu);
  initializeGPU(gpgpu, texManager);
  gpgpu.enableAutomaticDebugValidation(true);

  const hasBias = false;
  const program = new Conv2DTransposeProgram(
      xShape, fieldSize, origInputDepth, origStride, origPad, hasBias);
  const outputShape = program.outputShape as [number, number, number];
  const out = Array3D.zeros(outputShape);
  const x = Array3D.randUniform(xShape, -1, 1);
  const wShape = conv_util.computeWeightsShape4D(
      origInputDepth, origOutputDepth, fieldSize);
  const W = Array4D.randUniform(wShape, -1, 1);
  const inputs = [x, W];
  const binary = gpgpu_math.compileProgram(gpgpu, program, inputs, out);
  const start = performance.now();
  for (let i = 0; i < OP_RUNS; i++) {
    gpgpu_math.runProgram(binary, inputs, out);
  }
  out.getValues();
  const avgTime = (performance.now() - start) / OP_RUNS;

  texManager.dispose();
  gpgpu.deleteProgram(binary.webGLProgram);
  gpgpu.dispose();
  return avgTime;
};
