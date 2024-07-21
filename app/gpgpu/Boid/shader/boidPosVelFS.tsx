export const boidPosVelFS = `
    uniform float time;
    uniform float delta;

    vec2 repeat_xy(vec2 xy) {
        return xy - 2.0 * floor(0.5 * (xy + 1.0));
    }
    vec2 repeat_uv(vec2 uv) {
        return uv - floor(uv);
    }

    void main()	{
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        vec4 dtDataValue = texture2D( dtData, uv );
        int me = int(dtDataValue.r);
        int nextMe = 0;

        gl_FragColor.gba = dtDataValue.rgb;

        int neighberSum = -me;
        for(int y = -1; y <= 1; ++y){
            for(int x = -1; x <= 1; ++x){
                vec2 relativePos = vec2(x, y) / resolution.xy;
                vec2 pos = repeat_uv(uv + relativePos);
                vec4 neighberDtDataValue = texture2D(dtData, pos);
                neighberSum += int(neighberDtDataValue.r);
            }
        }
        if(me == 1 && (neighberSum >= 2 && neighberSum <= 3)){
            nextMe = 1;
        }else if(me == 0 && neighberSum == 3){
            nextMe = 1;
        }

        gl_FragColor.r = float(nextMe);
    }
`;