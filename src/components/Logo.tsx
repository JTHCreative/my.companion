import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  G,
  Path,
  Text as SvgText,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  /** When true, only renders the icon (dog + cat) without circle and text */
  iconOnly?: boolean;
}

export function Logo({ size = 512, iconOnly = false }: LogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={iconOnly ? '75 25 360 340' : '0 0 512 512'}
    >
      {!iconOnly && (
        <>
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#6FA85C" stopOpacity={1} />
              <Stop offset="100%" stopColor="#82B870" stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={256}
            cy={210}
            r={195}
            fill="none"
            stroke="url(#grad)"
            strokeWidth={6}
            opacity={0.2}
          />
        </>
      )}

      {/* ── Dog (facing left, sitting, taller) ── */}
      <G
        fill="none"
        stroke="#6FA85C"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body outline */}
        <Path
          d="M 95,138
             Q 88,118 105,102
             Q 120,90 132,84
             C 140,76 146,58 152,42
             C 156,36 162,42 162,56
             C 162,70 160,82 156,90
             Q 162,106 172,118
             Q 185,136 202,146
             Q 225,152 248,148
             Q 262,150 268,162
             Q 278,195 274,235
             Q 272,262 264,280
             Q 256,302 252,325
             Q 250,345 246,350
             L 232,350
             Q 234,335 238,315
             Q 244,292 238,278
             Q 225,272 206,270
             Q 188,272 176,278
             Q 172,292 172,315
             Q 172,340 170,350
             L 156,350
             Q 158,335 160,310
             Q 164,285 158,262
             Q 150,238 138,215
             Q 125,192 115,172
             Q 105,155 100,148
             Q 97,143 95,138 Z"
        />
        {/* Tail */}
        <Path
          d="M 268,162
             Q 275,138 270,115
             Q 265,98 258,88"
        />
      </G>
      {/* Dog eye */}
      <Circle cx={122} cy={112} r={3.5} fill="#6FA85C" />
      {/* Dog nose */}
      <Circle cx={95} cy={136} r={4} fill="#6FA85C" />

      {/* ── Cat (facing right, sitting, shorter) ── */}
      <G
        fill="none"
        stroke="#82B870"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body outline */}
        <Path
          d="M 415,148
             Q 422,128 410,112
             Q 398,98 388,92
             Q 378,86 374,76
             L 362,55
             L 355,76
             Q 350,90 346,102
             Q 340,118 330,132
             Q 316,146 298,152
             Q 278,158 266,162
             Q 256,168 252,178
             Q 244,205 246,235
             Q 248,260 254,278
             Q 260,300 264,325
             Q 268,345 270,350
             L 282,350
             Q 280,335 278,315
             Q 274,292 278,280
             Q 290,272 310,270
             Q 330,272 344,280
             Q 348,295 350,320
             Q 350,340 352,350
             L 364,350
             Q 362,335 360,310
             Q 356,285 362,262
             Q 370,238 382,215
             Q 394,192 404,175
             Q 412,160 415,152
             Q 416,150 415,148 Z"
        />
        {/* Tail (elegant upward curve) */}
        <Path
          d="M 252,178
             Q 244,148 246,115
             Q 250,82 260,65"
        />
      </G>
      {/* Cat eye */}
      <Circle cx={392} cy={118} r={3} fill="#82B870" />
      {/* Cat nose */}
      <Circle cx={415} cy={146} r={3.5} fill="#82B870" />

      {/* ── Text (full logo only) ── */}
      {!iconOnly && (
        <>
          <SvgText
            x={256}
            y={440}
            textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize={62}
            fontWeight="700"
            fill="#2D3A2E"
            letterSpacing={-1}
          >
            Petfolio
          </SvgText>
          <SvgText
            x={256}
            y={472}
            textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize={18}
            fill="#6B7C6B"
            letterSpacing={3}
          >
            COMPANION APP
          </SvgText>
        </>
      )}
    </Svg>
  );
}
