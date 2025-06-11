import { Response } from 'express';

export const sendResponse = (res: Response, status: number, data: any = null, message: string = '') => {
    res.status(status).json({
        status,
        data,
        message
    });
};
