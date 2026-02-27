import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  /** When true, only renders the icon (dog + cat silhouettes) without circle and text */
  iconOnly?: boolean;
}

export function Logo({ size = 512, iconOnly = false }: LogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={iconOnly ? '105 50 315 315' : '0 0 512 512'}
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
            cy={232}
            r={195}
            fill="none"
            stroke="url(#grad)"
            strokeWidth={6}
            opacity={0.2}
          />
        </>
      )}

      {/* Dog silhouette (left) */}
      <G fill="#6FA85C">
        {/* Head */}
        <Circle cx={175} cy={148} r={42} />
        {/* Left ear (rounded, semi-erect — dog-like) */}
        <Path d="M 145,115 C 132,98 118,78 124,68 C 130,58 140,60 146,72 C 152,84 155,100 155,115 Z" />
        {/* Right ear */}
        <Path d="M 205,115 C 218,98 232,78 226,68 C 220,58 210,60 204,72 C 198,84 195,100 195,115 Z" />
        {/* Muzzle */}
        <Ellipse cx={175} cy={183} rx={20} ry={14} />
        {/* Neck */}
        <Path d="M 150,180 Q 142,210 140,240 L 210,240 Q 208,210 200,180 Z" />
        {/* Body */}
        <Ellipse cx={175} cy={282} rx={55} ry={80} />
        {/* Front left leg */}
        <Rect x={148} y={338} width={22} height={20} rx={5} />
        {/* Front right leg */}
        <Rect x={182} y={338} width={22} height={20} rx={5} />
      </G>

      {/* Cat silhouette (right) */}
      <G fill="#82B870">
        {/* Head */}
        <Circle cx={335} cy={153} r={36} />
        {/* Left ear (sharp, pointed — cat-like) */}
        <Path d="M 312,125 L 298,65 L 335,115 Z" />
        {/* Right ear */}
        <Path d="M 335,115 L 372,65 L 358,125 Z" />
        {/* Neck */}
        <Path d="M 315,182 Q 310,210 308,238 L 362,238 Q 360,210 355,182 Z" />
        {/* Body */}
        <Ellipse cx={335} cy={282} rx={45} ry={75} />
        {/* Front left leg */}
        <Rect x={317} y={338} width={18} height={20} rx={4} />
        {/* Front right leg */}
        <Rect x={342} y={338} width={18} height={20} rx={4} />
        {/* Tail (elegant upward curve) */}
        <Path d="M 376,300 Q 392,275 400,248 Q 406,228 400,218 Q 394,212 392,222 Q 388,242 380,265 Q 372,286 370,298 Z" />
      </G>

      {/* Text — full logo only */}
      {!iconOnly && (
        <>
          <SvgText
            x={256}
            y={430}
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
            y={462}
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
