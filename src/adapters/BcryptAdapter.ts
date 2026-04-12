import { BcryptInterface } from '../ports/interfaces';
import * as bcrypt from 'bcryptjs';

export class BcryptAdapter implements BcryptInterface {
    constructor(private readonly saltRounds: number = 10) {}

    async hash(data: string): Promise<string> {
        return bcrypt.hash(data, this.saltRounds);
    }

    async compare(data: string, encrypted: string): Promise<boolean> {
        return bcrypt.compare(data, encrypted);
    }
}