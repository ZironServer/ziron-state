/*
Author: Luca Scaringella
GitHub: LucaCode
Copyright(c) Luca Scaringella
 */

import crypto = require('crypto');

export function generateSecret() {
    const hash = crypto.createHmac('sha512', crypto.randomBytes(128).toString('hex'));
    return hash.update(crypto.randomBytes(128).toString('hex')).digest('hex');
}

/**
 * @description
 * Returns a random item of the given array.
 * If the array is empty, it returns undefined.
 * @param array
 */
export function getRandomArrayItem<T>(array: T[]): T | undefined {
    return array[Math.floor(Math.random() * array.length)];
}