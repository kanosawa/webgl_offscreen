// シェーダのコンパイル
function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("シェーダのコンパイルに失敗: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// シェーダプログラムの作成
function createShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("シェーダプログラムのリンクに失敗: " + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

class Offscreen {

    getFrameBuffer(viewport) {
        if (this.width === undefined || this.height === undefined || viewport[2] != this.width || viewport[3] != this.height) {
            this.width = viewport[2];
            this.height = viewport[3];
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.#framebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        return this.#framebuffer;
    }

    renderOffscreenTexture() {

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.vertices), this.gl.STATIC_DRAW);
    
        // 頂点属性の設定
        const positionAttribLocation = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
        this.gl.enableVertexAttribArray(positionAttribLocation);
        this.gl.vertexAttribPointer(positionAttribLocation, 2, this.gl.FLOAT, false, 0, 0);
    
        // テクスチャ座標の設定
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.textureCoordinates), this.gl.STATIC_DRAW);
    
        // テクスチャ座標属性の設定
        const textureCoordAttribLocation = this.gl.getAttribLocation(this.shaderProgram, 'aTextureCoord');
        this.gl.enableVertexAttribArray(textureCoordAttribLocation);
        this.gl.vertexAttribPointer(textureCoordAttribLocation, 2, this.gl.FLOAT, false, 0, 0);
    
        // テクスチャのバインド
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    
        // シェーダプログラムの使用
        this.gl.useProgram(this.shaderProgram);
    
        // テクスチャサンプラーの設定
        this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uSampler'), 0);
    
        // メインキャンバスにテクスチャを描画
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    constructor(gl) {
        this.gl = gl;
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.#framebuffer = gl.createFramebuffer();

        // テクスチャ用の頂点シェーダ
        const vertexShaderSource =
        'attribute vec4 aVertexPosition;' +
        'attribute vec2 aTextureCoord;' +
        'varying highp vec2 vTextureCoord;' +
        'void main() {' +
        '    gl_Position = aVertexPosition;' +
        '    vTextureCoord = aTextureCoord;' +
        '}';

        // テクスチャ用のフラグメントシェーダ
        const fragmentShaderSource =
        'precision mediump float;' +
        'varying highp vec2 vTextureCoord;' +
        'uniform sampler2D uSampler;' +
        'void main() {' +
        '    gl_FragColor = texture2D(uSampler, vTextureCoord);' +
        '    gl_FragColor.a = 0.3;' +
        '}';

        // シェーダプログラムの作成
        this.shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
        this.vertexBuffer = gl.createBuffer();
        this.textureCoordBuffer = gl.createBuffer();
    }

    gl;
    #framebuffer;
    texture;
    shaderProgram;
    vertexBuffer;
    textureCoordBuffer;
    width;
    height;

    vertices = [
        -1, -1,
        1, -1,
        -1,  1,
        1,  1,
    ];

    textureCoordinates = [
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        1.0,  1.0,
    ];
};

// オフスクリーンレンダリング
function offscreenRendering(gl, offscreen) {

    // シンプルな頂点シェーダ
    const vertexShaderSource = 
    'attribute vec4 aVertexPosition;' +
    'void main() {' +
    '    gl_Position = aVertexPosition;' +
    '}';

    // シンプルなフラグメントシェーダ
    const fragmentShaderSource =
    'precision mediump float;' +
    'void main() {' +
    '    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);' +
    '}';

    // シェーダプログラムの作成
    const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

    // 頂点情報の設定
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    const vertices = [
        -1, -1,
        1, -1,
        -1,  1,
        1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // 頂点属性の設定
    const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);

    const framebuffer = offscreen.getFrameBuffer([0, 0, 640, 480]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    // オフスクリーンレンダリング
    gl.viewport(0, 0, 640, 480);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shaderProgram);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function init() {

    // WebGL2 コンテキストの取得
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        alert("WebGL2 を初期化できません。ブラウザがサポートしていない可能性があります。");
        return;
    }

    const offscreen = new Offscreen(gl);
    offscreenRendering(gl, offscreen);
    offscreen.renderOffscreenTexture();
}