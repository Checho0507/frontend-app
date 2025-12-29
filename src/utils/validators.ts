export const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validatePhone = (phone: string): boolean => {
    const re = /^3[0-9]{9}$/;
    return re.test(phone);
};

export const validateAccountNumber = (account: string): boolean => {
    const re = /^[0-9]{6,20}$/;
    return re.test(account);
};