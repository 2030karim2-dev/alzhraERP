import { FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

export const zodResolver = <T extends z.ZodTypeAny>(schema: T): Resolver<z.infer<T>> => {
    return (values: FieldValues) => {
        try {
            const data = schema.parse(values);
            return {
                values: data,
                errors: {}
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const formErrors = error.errors.reduce((acc, curr) => {
                    const key = curr.path.join('.');
                    acc[key] = {
                        type: curr.code,
                        message: curr.message,
                    };
                    return acc;
                }, {} as Record<string, any>);

                return {
                    values: {},
                    errors: formErrors,
                };
            }
            return {
                values: {},
                errors: {
                    root: {
                        type: 'unknown',
                        message: 'حدث خطأ غير متوقع في التحقق من البيانات',
                    }
                }
            };
        }
    };
};
