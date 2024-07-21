export const viewFS = `
    uniform sampler2D dtData;
    uniform vec2 resolution;
    uniform float time;
    uniform float delta;
    uniform vec2 viewPos;
    uniform vec2 mousePos;
    uniform float scale;
    varying vec2 vUv;

    vec2 repeat_xy(vec2 xy) {
        return xy - 2.0 * floor(0.5 * (xy + 1.0));
    }
    vec2 repeat_uv(vec2 uv) {
        return uv - floor(uv);
    }

    void main()	{
        vec2 xy = (vUv * 2.0 - 1.0) * resolution / max(resolution.x, resolution.y);
        xy = repeat_xy(xy);

        vec2 uv = vUv * resolution;
        uv = scale * uv;
        uv = uv - viewPos;
        uv = uv / max(resolution.x, resolution.y);
        uv = repeat_uv(uv);

        vec4 dtDataValue = texture2D(dtData, uv);

        vec3 color = vec3(0.0);
        
        if(dtDataValue.r == 1.0){
            color = vec3(1.0);
        }else if(dtDataValue.g == 1.0){
            color = vec3(0.5);
        }else if(dtDataValue.b == 1.0){
            color = vec3(0.25);
        }else if(dtDataValue.a == 1.0){
            color = vec3(0.125);
        }

        gl_FragColor = vec4(color, 1.0);
    }
`;