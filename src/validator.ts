import { isValidObjectId } from 'mongoose';
import CustomError from './utils/CustomError.util';

export function validate(param: string, value: any, isMongoId?: boolean): true {
    if (!value) {
        throw new CustomError(`${param} is required`, 400);
    }

    if (isMongoId && !isValidObjectId(value)) {
        throw new CustomError(`${value} is not a valid Mongo ID`, 400);
    }

    return true;
}
