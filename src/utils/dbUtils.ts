// utils/dbUtils.ts
// Contém funções utilitárias para a camada de banco de dados, como a conversão
// entre os padrões de nomenclatura camelCase (usado na aplicação) e snake_case (usado no Supabase).

/**
 * Converte recursivamente as chaves de um objeto de camelCase para snake_case.
 * @param obj O objeto a ser convertido.
 * @returns Um novo objeto com as chaves em snake_case.
 */
export const toSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => toSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = toSnakeCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

/**
 * Converte recursivamente as chaves de um objeto de snake_case para camelCase.
 * @param obj O objeto a ser convertido.
 * @returns Um novo objeto com as chaves em camelCase.
 */
export const toCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            acc[camelKey] = toCamelCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};