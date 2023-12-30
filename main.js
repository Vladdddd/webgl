"use strict";

let gl;
let surface;
let lighting;
let shProgram;
let spaceball;

const x1 = -1;
const x2 = 1;
const y1 = -1;
const y2 = 1;

const calcStepX = (x2 - x1) / 30;
const calcStepY = (y2 - y1) / 30;

function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iNormalBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices, normals) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, true, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribNormal);

    gl.drawArrays(gl.TRIANGLE_STRIP - 1, 0, this.count);
  };
}

function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  this.iAttribVertex = -1;
  this.iColor = -1;
  this.iModelViewProjectionMatrix = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let projection = m4.perspective(Math.PI / 8, 1, 8, 20);

  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
  let translateToPointZero = m4.translation(0, 0, -12);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

  const normal = m4.identity();
  m4.inverse(modelView, normal);
  m4.transpose(normal, normal);

  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normal);

  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

  const movement = Date.now() * 0.001;

  sphereMoving(movement);
  lightMoving(movement);

  surface.Draw();
  gl.uniform1i(shProgram.iLighting, true);
  lighting.Draw();
  gl.uniform1i(shProgram.iLighting, false);
}

function CreateShoeSurfaceData() {
  let vertexList = [];

  for (let j = x1; j < x2 + calcStepX; j += calcStepX) {
    for (let i = y1; i < y2 + calcStepY; i += calcStepY) {
      vertexList.push(i, j, calculateZ(i, j));
      vertexList.push(i + calcStepY, j, calculateZ(i + calcStepY, j));
      vertexList.push(i, j + calcStepX, calculateZ(i, j + calcStepX));
      vertexList.push(i, j + calcStepX, calculateZ(i, j + calcStepX));
      vertexList.push(i + calcStepY, j, calculateZ(i + calcStepY, j));
      vertexList.push(i + calcStepY, j + calcStepX, calculateZ(i + calcStepY, j + calcStepX));
    }
  }
  return vertexList;
}

let calculateZ = function (x, y) {
  return (x * x * x) / 3 - (y * y) / 2;
};

function CreateShoeNormalData() {
  let normalList = [];

  for (let j = x1; j < x2 + calcStepX; j += calcStepX) {
    for (let i = y1; i < y2 + calcStepY; i += calcStepY) {
      normalList.push(...calculateNormal(i, j, calcStepX, calcStepY));
      normalList.push(...calculateNormal(i + calcStepY, j, calcStepX, calcStepY));
      normalList.push(...calculateNormal(i, j + calcStepX, calcStepX, calcStepY));
      normalList.push(...calculateNormal(i, j + calcStepX, calcStepX, calcStepY));
      normalList.push(...calculateNormal(i + calcStepY, j, calcStepX, calcStepY));
      normalList.push(...calculateNormal(i + calcStepY, j + calcStepX, calcStepX, calcStepY));
    }
  }
  return normalList;
}

function calculateNormal(i, j, stepJ, stepI) {
  let v0 = [i, j, calculateZ(i, j)];

  let v1 = [i + stepI, j, calculateZ(i + stepI, j)];
  let v01 = m4.subtractVectors(v1, v0);

  let v2 = [i, j + stepJ, calculateZ(i, j + stepJ)];
  let v02 = m4.subtractVectors(v2, v0);
  let n1 = m4.normalize(m4.cross(v01, v02));

  let v3 = [i - stepI, j + stepJ, calculateZ(i - stepI, j + stepJ)];
  let v03 = m4.subtractVectors(v3, v0);
  let n2 = m4.normalize(m4.cross(v02, v03));

  let v4 = [i - stepI, j, calculateZ(i - stepI, j)];
  let v04 = m4.subtractVectors(v4, v0);
  let n3 = m4.normalize(m4.cross(v03, v04));

  let v5 = [i - stepI, j - stepJ, calculateZ(i - stepI, j - stepJ)];
  let v05 = m4.subtractVectors(v5, v0);
  let n4 = m4.normalize(m4.cross(v04, v05));

  let v6 = [i, j - stepJ, calculateZ(i, j - stepJ)];
  let v06 = m4.subtractVectors(v6, v0);
  let n5 = m4.normalize(m4.cross(v05, v06));

  let n6 = m4.normalize(m4.cross(v06, v01));

  const n01 = n1[0] + n2[0] + n3[0] + n4[0] + n5[0] + n6[0];
  const n02 = n1[1] + n2[1] + n3[1] + n4[1] + n5[1] + n6[1];
  const n03 = n1[2] + n2[2] + n3[2] + n4[2] + n5[2] + n6[2];

  let n = [n01 / 6.0, n02 / 6.0, n03 / 6.0];

  n = m4.normalize(n);
  return n;
}

function animate() {
  window.requestAnimationFrame(animate);
  draw();
}

function sphereMoving(movement) {
  gl.uniformMatrix4fv(shProgram.iTranslationMatrix, false, m4.translation(Math.cos(movement), Math.sin(movement), 0));
}

function lightMoving(movement) {
  gl.uniform3fv(shProgram.iLightPosition, [Math.cos(movement), Math.sin(movement), 0]);
}

function CreateLightData() {
  let vertexList = [];
  const step = 0.5;

  for (let phi = 0; phi < Math.PI; phi += step) {
    for (let theta = 0; theta < Math.PI * 2; theta += step) {
      let v1 = CreateSphereData(phi, theta);
      let v2 = CreateSphereData(phi + step, theta);
      let v3 = CreateSphereData(phi, theta + step);
      let v4 = CreateSphereData(phi + step, theta + step);

      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);

      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
    }
  }

  return vertexList;
}

function CreateSphereData(phi, theta) {
  const radius = 0.1;
  const x = radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(theta);
  return { x, y, z };
}

function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
  shProgram.iTranslationMatrix = gl.getUniformLocation(prog, "TranslationMatrix");
  shProgram.iColor = gl.getUniformLocation(prog, "color");
  shProgram.iLighting = gl.getUniformLocation(prog, "lighting");
  shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPos");

  surface = new Model("Surface");
  const surfaceData = CreateShoeSurfaceData();
  const normalData = CreateShoeNormalData();
  surface.BufferData(surfaceData, normalData);

  lighting = new Model();
  lighting.BufferData(CreateLightData(), CreateLightData());

  gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

function init() {
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML = "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  draw();
  animate();
}
