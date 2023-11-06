const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    alert('WebGL2 is not available in your browser.');
    throw new Error('WebGL2 not available');
}

const vertexShaderSrc = `
    attribute vec2 position;
    uniform mat3 transformMat;
    void main() {
        vec3 pos3D = transformMat  * vec3(position, 1.0);
        gl_Position = vec4(pos3D, 1.0);
    }
`;

const fragmentShaderSrc = `
    precision mediump float;
    uniform vec3 color;
    void main() {
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Compile shader
function compileShader(src, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Could not compile shader:\n' + info);
    }
    return shader;
}

const vertexShader = compileShader(vertexShaderSrc, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fragmentShaderSrc, gl.FRAGMENT_SHADER);

// Link shaders into a program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Could not link program:\n' + info);
}

// Function to multiply two matrices
function mul(matrixA, matrixB) {
    if (matrixA.length !== 9 || matrixB.length !== 9) {
        console.error("Both matrices must be 3x3 matrices.");
        return null;
    }

    const result = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            let sum = 0;
            for (let k = 0; k < 3; k++) {
                sum += matrixA[i * 3 + k] * matrixB[k * 3 + j];
            }
            result.push(sum);
        }
    }

    return result;
}

// Calculate the coordinates of the dividing points
const divideLineIntoThree = (point1, point2) => {
    const dividingPoints = [];

    // Calculate the coordinates of the first dividing point
    const firstDividingPoint = {
        x: point1.x + (1 / 3) * (point2.x - point1.x),
        y: point1.y + (1 / 3) * (point2.y - point1.y),
    };

    // Calculate the coordinates of the second dividing point
    const secondDividingPoint = {
        x: point1.x + (2 / 3) * (point2.x - point1.x),
        y: point1.y + (2 / 3) * (point2.y - point1.y),
    };

    dividingPoints.push(firstDividingPoint, secondDividingPoint);

    return dividingPoints;
};

function findThirdVertex(v1, v2) {
    // Calculate the distance between v1 and v2
    const distance = Math.sqrt(
        Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
    );

    // Calculate the angle between the line connecting v1 and v2 and the x-axis
    const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);

    // Calculate the coordinates of the third vertex
    const thirdVertexX = v1.x + distance * Math.cos(angle + (Math.PI) / 3);
    const thirdVertexY = v1.y + distance * Math.sin(angle + (Math.PI) / 3);

    return { x: thirdVertexX, y: thirdVertexY };
}

function addTriangles(point1, point2, verticesOut, iteration, firstTime)
{
    if(iteration <= 0){
        return;
    }

    let dividingPoints = divideLineIntoThree(point1, point2);
    let thirdPoint = findThirdVertex(dividingPoints[0], dividingPoints[1]);
    verticesOut.push(dividingPoints[0], dividingPoints[1], thirdPoint);

    addTriangles(dividingPoints[0], thirdPoint, verticesOut, iteration-1, false);
    addTriangles(thirdPoint, dividingPoints[1], verticesOut, iteration-1, false);

    if(firstTime)
    {
        addTriangles(point1, dividingPoints[0], verticesOut, iteration-1, false);
        addTriangles(dividingPoints[1], point2 , verticesOut, iteration-1, false);
    }
}


vertices = []
let point1 = { x: 0.0, y: 0.5 * Math.sqrt(3) - 0.5};
let point2 = { x: 0.5, y: -0.5 };
let point3 = { x: -0.5, y: -0.5 };
vertices.push(point1, point2, point3)

const centerOfTriangle = (point1.y + point2.y + point3.y) / 3;

addTriangles(point1, point2, vertices, 4, true)
addTriangles(point2, point3, vertices, 4, true)
addTriangles(point3, point1, vertices, 4, true)

const verticesFinal = vertices.map(obj => [obj.x, obj.y]).flat();

gl.useProgram(program);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticesFinal), gl.STATIC_DRAW);

const position = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(position);
gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

// Clear and draw
gl.clearColor(1.0, 1.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

let translateMatrix1 = [
    1.0, 0.0, 0.0,
    0.0, 1.0, -centerOfTriangle,
    0.0, 0.0, 1.0
];

let translateMatrix2 = [
    1.0, 0.0, 0.0,
    0.0, 1.0, centerOfTriangle,
    0.0, 0.0, 1.0
];

let scaleMatrix1 = [
    1.0, 0.0, 0,
    0.0, 1.0, 0,
    0, 0, 1,
];

let scaleMatrix2 = [
    0.65, 0.0, 0,
    0.0, 0.65, 0,
    0.0, 0.0, 1.0,
];

colorBlue = [0.0, 0.0, 0.8];
colorWhite = [1.0, 1.0, 1.0];

let transformMat1 = mul(translateMatrix2, mul(scaleMatrix1, translateMatrix1));
const transformMatLoc = gl.getUniformLocation(program, 'transformMat');
const colorLoc = gl.getUniformLocation(program, 'color');

gl.uniformMatrix3fv(transformMatLoc, true, transformMat1);
gl.uniform3fv(colorLoc, colorBlue);
gl.drawArrays(gl.TRIANGLES, 0, verticesFinal.length / 2);

let transformMat2 = mul(translateMatrix2, mul(scaleMatrix2, translateMatrix1));
gl.uniformMatrix3fv(transformMatLoc, true, transformMat2);
gl.uniform3fv(colorLoc, colorWhite);
gl.drawArrays(gl.TRIANGLES, 0, verticesFinal.length / 2);