import { ENV } from '../constants';

export const getPreviousMonthAndYear = (month: string, year: number) => {
    const { months } = ENV;

    if (month === 'january') return { previousMonth: 'february', previousYear: year - 1 };

    const previousMonth = months[months.findIndex((item) => item === month) - 1];

    return { previousMonth, previousYear: year };
};
