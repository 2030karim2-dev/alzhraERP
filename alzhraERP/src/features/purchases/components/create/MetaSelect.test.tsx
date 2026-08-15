import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MetaSelect from './MetaSelect';

describe('MetaSelect Component', () => {
    const options = [
        { id: 'cash', label: 'نقدي (Cash)' },
        { id: 'credit', label: 'آجل (Credit)' },
    ];

    beforeEach(() => {
        // jsdom لا ينفذ scrollIntoView داخل المتصفح
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('renders placeholder when no value selected', () => {
        render(<MetaSelect value="" onChange={vi.fn()} options={options} placeholder="اختر الصندوق..." />);
        expect(screen.getByText('اختر الصندوق...')).toBeInTheDocument();
    });

    it('renders the selected option label', () => {
        render(<MetaSelect value="cash" onChange={vi.fn()} options={options} />);
        expect(screen.getByText('نقدي (Cash)')).toBeInTheDocument();
    });

    it('opens the dropdown list below the trigger on click', () => {
        render(<MetaSelect value="" onChange={vi.fn()} options={options} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        expect(screen.getByText('آجل (Credit)')).toBeInTheDocument();
    });

    it('calls onChange and closes the dropdown when an option is selected', () => {
        const onChange = vi.fn();
        render(<MetaSelect value="" onChange={onChange} options={options} />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('آجل (Credit)'));
        expect(onChange).toHaveBeenCalledWith('credit');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes the dropdown on Escape', () => {
        render(<MetaSelect value="" onChange={vi.fn()} options={options} />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows empty state when no options available', () => {
        render(<MetaSelect value="" onChange={vi.fn()} options={[]} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('لا توجد خيارات')).toBeInTheDocument();
    });
});
