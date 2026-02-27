import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  G,
  Path,
  Ellipse,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  /** When true, only renders the icon (dog + cat) without the background circle */
  iconOnly?: boolean;
}

export function Logo({ size = 512, iconOnly = false }: LogoProps) {
  const scale = size / 512;

  return (
    <Svg
      width={size}
      height={iconOnly ? size * 0.6 : size}
      viewBox={iconOnly ? '100 70 300 300' : '0 0 512 512'}
    >
      {!iconOnly && (
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#6FA85C" stopOpacity={1} />
            <Stop offset="100%" stopColor="#82B870" stopOpacity={1} />
          </LinearGradient>
        </Defs>
      )}

      {!iconOnly && (
        <Circle
          cx={256}
          cy={232}
          r={195}
          fill="none"
          stroke="#6FA85C"
          strokeWidth={6}
          opacity={0.2}
        />
      )}

      {/* Dog outline (left side) */}
      <G
        fill="none"
        stroke="#6FA85C"
        strokeWidth={iconOnly ? 5.5 : 4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Dog ear left */}
        <Path d="M120,155 Q108,120 115,100 Q120,88 132,95 Q140,102 145,125 L148,148" />
        {/* Dog head */}
        <Path d="M148,148 Q152,135 168,128 Q185,122 200,130 Q210,136 212,148" />
        {/* Dog ear right */}
        <Path d="M200,130 Q205,115 210,100 Q215,88 225,92 Q233,98 230,120 Q228,135 212,148" />
        {/* Dog face */}
        <Path d="M148,148 Q145,165 148,178 Q152,192 165,198 Q178,202 190,198 Q203,192 207,178 Q210,165 212,148" />
        {/* Dog nose */}
        <Ellipse cx={180} cy={172} rx={10} ry={7} />
        {/* Dog eyes */}
        <Circle cx={158} cy={152} r={4} fill="#6FA85C" />
        <Circle cx={200} cy={152} r={4} fill="#6FA85C" />
        {/* Dog mouth */}
        <Path d="M170,180 Q180,188 190,180" />
        {/* Dog body */}
        <Path d="M148,198 Q130,215 120,248 Q114,270 118,290 Q120,300 128,305" />
        <Path d="M207,198 Q220,215 225,240 Q228,258 225,275 Q222,290 218,300" />
        {/* Dog front legs */}
        <Path d="M128,305 Q125,330 128,348 Q130,355 136,355 Q142,355 142,348" />
        <Path d="M155,300 Q153,330 155,348 Q157,355 163,355 Q168,355 168,348" />
        {/* Dog back legs */}
        <Path d="M195,300 Q193,325 195,348 Q197,355 203,355 Q208,355 208,348" />
        <Path d="M218,300 Q220,325 218,348 Q216,355 210,355" />
        {/* Dog tail */}
        <Path d="M225,275 Q240,260 250,245 Q255,238 252,232" />
        {/* Dog belly */}
        <Path d="M128,305 Q142,312 155,300" />
        <Path d="M195,300 Q206,310 218,300" />
      </G>

      {/* Cat outline (right side) */}
      <G
        fill="none"
        stroke="#82B870"
        strokeWidth={iconOnly ? 5.5 : 4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Cat ear left */}
        <Path d="M290,148 L278,90 Q276,82 282,82 Q290,84 298,108 L302,130" />
        {/* Cat ear right */}
        <Path d="M355,148 L348,108 Q344,88 352,82 Q358,82 360,90 L370,148" />
        {/* Cat head */}
        <Path d="M290,148 Q285,160 288,175 Q292,192 310,200 Q325,205 340,200 Q358,192 362,175 Q365,160 370,148" />
        {/* Cat eyes */}
        <Path d="M298,158 Q308,150 318,158 Q308,162 298,158" fill="#82B870" />
        <Path d="M338,158 Q348,150 358,158 Q348,162 338,158" fill="#82B870" />
        {/* Cat nose */}
        <Path d="M325,175 L320,182 L330,182 Z" fill="#82B870" />
        {/* Cat whiskers */}
        <Path d="M320,185 L290,182" />
        <Path d="M320,188 L288,190" />
        <Path d="M330,185 L360,182" />
        <Path d="M330,188 L362,190" />
        {/* Cat mouth */}
        <Path d="M325,182 Q320,190 318,192" />
        <Path d="M325,182 Q330,190 332,192" />
        {/* Cat body */}
        <Path d="M310,200 Q295,220 288,248 Q282,275 286,300 Q288,310 295,315" />
        <Path d="M340,200 Q360,225 368,255 Q372,278 368,300 Q366,310 360,315" />
        {/* Cat front legs */}
        <Path d="M295,315 Q292,335 294,350 Q296,357 302,357 Q307,357 307,350" />
        <Path d="M320,312 Q318,335 320,350 Q322,357 328,357 Q333,357 333,350" />
        {/* Cat back legs */}
        <Path d="M345,310 Q343,332 345,350 Q347,357 353,357 Q358,357 358,350" />
        <Path d="M360,315 Q362,332 360,350 Q358,357 352,357" />
        {/* Cat tail */}
        <Path d="M368,300 Q385,280 395,258 Q400,242 395,228 Q390,220 382,225" />
        {/* Cat belly */}
        <Path d="M295,315 Q308,322 320,312" />
        <Path d="M345,310 Q352,318 360,315" />
      </G>
    </Svg>
  );
}
