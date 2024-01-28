function init() {

    // WebGL2 コンテキストの取得
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        alert("WebGL2 を初期化できません。ブラウザがサポートしていない可能性があります。");
        return;
    }

    // シェーダのコンパイル
    function compileShader(type, source) {
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
    function createShaderProgram(vertexShaderSource, fragmentShaderSource) {
        const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
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
    const shaderProgram = createShaderProgram(vertexShaderSource, fragmentShaderSource);

    // 頂点情報の設定
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    const vertices = [
        -0.5, -0.5,
        0.5, -0.5,
        -0.5,  0.5,
        0.5,  0.5,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // 頂点属性の設定
    const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);

    // オフスクリーンレンダリング用のフレームバッファとテクスチャの作成
    const offscreenFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFramebuffer);

    const offscreenTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, offscreenTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 640, 480, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, offscreenTexture, 0);

    // オフスクリーンレンダリング
    gl.viewport(0, 0, 640, 480);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shaderProgram);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // テクスチャ用の頂点シェーダ
    const textureVertexShaderSource =
        'attribute vec4 aVertexPosition;' +
        'attribute vec2 aTextureCoord;' +
        'varying highp vec2 vTextureCoord;' +
        'void main() {' +
        '    gl_Position = aVertexPosition;' +
        '    vTextureCoord = aTextureCoord;' +
        '}';

    // テクスチャ用のフラグメントシェーダ
    const textureFragmentShaderSource =
        'precision mediump float;' +
        'varying highp vec2 vTextureCoord;' +
        'uniform sampler2D uSampler;' +
        'void main() {' +
        '    gl_FragColor = texture2D(uSampler, vTextureCoord);' +
        '}';

    // シェーダプログラムの作成
    const textureShaderProgram = createShaderProgram(textureVertexShaderSource, textureFragmentShaderSource);

    // テクスチャ座標の設定
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    const textureCoordinates = [
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        1.0,  1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    // テクスチャ座標属性の設定
    const textureCoordAttribLocation = gl.getAttribLocation(textureShaderProgram, 'aTextureCoord');
    gl.enableVertexAttribArray(textureCoordAttribLocation);
    gl.vertexAttribPointer(textureCoordAttribLocation, 2, gl.FLOAT, false, 0, 0);

    // テクスチャのバインド
    gl.bindTexture(gl.TEXTURE_2D, offscreenTexture);

    // シェーダプログラムの使用
    gl.useProgram(textureShaderProgram);

    // テクスチャサンプラーの設定
    gl.uniform1i(gl.getUniformLocation(textureShaderProgram, 'uSampler'), 0);

    // メインキャンバスにテクスチャを描画
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}