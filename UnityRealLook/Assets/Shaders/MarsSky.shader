// Daytime Mars sky: butterscotch horizon haze darkening toward the zenith,
// a small sun disc and the pale forward-scattering aureole that suspended
// dust produces around the sun. Colour targets follow rover sky imagery.
Shader "Echoes/Mars Sky"
{
    Properties
    {
        _ZenithColor ("Zenith", Color) = (0.42, 0.29, 0.21, 1)
        _HorizonColor ("Horizon", Color) = (0.80, 0.60, 0.44, 1)
        _GroundColor ("Below horizon", Color) = (0.42, 0.27, 0.18, 1)
        _AureoleColor ("Sun aureole", Color) = (0.86, 0.82, 0.76, 1)
        _SunColor ("Sun disc", Color) = (1, 0.97, 0.92, 1)
        _SunDirection ("Sun direction", Vector) = (0.4, 0.5, 0.3, 0)
        _SunSize ("Sun size", Range(0.0005, 0.02)) = 0.0035
        _AureolePower ("Aureole tightness", Range(1, 64)) = 10
        _AureoleStrength ("Aureole strength", Range(0, 2)) = 0.55
        _HorizonFalloff ("Horizon falloff", Range(0.1, 4)) = 0.55
        _Exposure ("Exposure", Range(0, 8)) = 1.35
    }
    SubShader
    {
        Tags { "Queue" = "Background" "RenderType" = "Background" "PreviewType" = "Skybox" "RenderPipeline" = "UniversalPipeline" }
        Cull Off
        ZWrite Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)
                half4 _ZenithColor, _HorizonColor, _GroundColor, _AureoleColor, _SunColor;
                float4 _SunDirection;
                float _SunSize, _AureolePower, _AureoleStrength, _HorizonFalloff, _Exposure;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; UNITY_VERTEX_INPUT_INSTANCE_ID };
            struct Varyings { float4 positionCS : SV_POSITION; float3 direction : TEXCOORD0; UNITY_VERTEX_OUTPUT_STEREO };

            Varyings Vert(Attributes input)
            {
                Varyings output;
                UNITY_SETUP_INSTANCE_ID(input);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(output);
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.direction = input.positionOS.xyz;
                return output;
            }

            half4 Frag(Varyings input) : SV_Target
            {
                float3 dir = normalize(input.direction);
                float3 sunDir = normalize(_SunDirection.xyz);
                float height = dir.y;
                float up = pow(saturate(height), _HorizonFalloff);
                half3 sky = lerp(_HorizonColor.rgb, _ZenithColor.rgb, up);
                // Thin bright haze band right at the horizon.
                sky += _HorizonColor.rgb * 0.18 * exp(-abs(height) * 22.0);
                sky = height < 0 ? lerp(sky, _GroundColor.rgb, saturate(-height * 6.0)) : sky;

                float cosSun = dot(dir, sunDir);
                float aureole = pow(saturate(cosSun), _AureolePower) * _AureoleStrength
                              + pow(saturate(cosSun), _AureolePower * 12.0) * _AureoleStrength * 1.5;
                sky = lerp(sky, _AureoleColor.rgb, saturate(aureole)) + _AureoleColor.rgb * aureole * 0.35;
                float disc = smoothstep(1.0 - _SunSize, 1.0 - _SunSize * 0.55, cosSun);
                sky += _SunColor.rgb * disc * 18.0;
                return half4(sky * _Exposure, 1);
            }
            ENDHLSL
        }
    }
    Fallback Off
}
