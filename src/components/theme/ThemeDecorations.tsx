'use client';

import React from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import TetDecorations from './TetDecorations';
import ValentineDecorations from './ValentineDecorations';
import ChildrenDayDecorations from './ChildrenDayDecorations';

export default function ThemeDecorations() {
  const { theme } = useTheme();

  switch (theme) {
    case 'tet':
      return <TetDecorations />;
    case 'valentine':
      return <ValentineDecorations />;
    case 'children':
      return <ChildrenDayDecorations />;
    default:
      return null;
  }
}
