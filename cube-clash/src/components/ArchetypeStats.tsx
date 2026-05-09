import React from 'react';
import {
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, ResponsiveContainer
} from 'recharts';

interface Props {
  stats: {
    mobility: number;
    stability: number;
    power: number;
    speed: number;
  };
  color: string;
}

export const ArchetypeStats: React.FC<Props> = ({ stats, color }) => {
  const data = [
    { subject: 'Mobility', A: stats.mobility, fullMark: 150 },
    { subject: 'Stability', A: stats.stability, fullMark: 150 },
    { subject: 'Power', A: stats.power, fullMark: 150 },
    { subject: 'Speed', A: stats.speed, fullMark: 150 },
  ];

  return (
    <div className="w-64 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#ffffff20" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#ffffff60', fontSize: 10, fontWeight: 'bold' }} 
          />
          <Radar
            name="Archetype"
            dataKey="A"
            stroke={color}
            fill={color}
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
