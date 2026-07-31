
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PageLoader from './PageLoader';

describe('PageLoader', () => {
  it('renders correctly', () => {
    render(<PageLoader />);
    expect(screen.getByText(/جاري تحميل البيانات/i)).toBeInTheDocument();
  });
});
