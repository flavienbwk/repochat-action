import { useState, useEffect } from 'react';
import { checkToken, getSettings } from '../Api';

export default function useAuth() {
    const [token, setToken] = useState('');
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    useEffect(() => {
        const validateToken = async () => {
            const settings = await getSettings();
            const savedToken = localStorage.getItem('chatToken');

            if (savedToken && settings.interface_password_enabled) {
                setToken(savedToken);
                const isValid = await checkToken(savedToken);
                setIsTokenValid(isValid);
                setShowPasswordModal(!isValid);
            } else if (settings.interface_password_enabled) {
                setShowPasswordModal(true);
            } else {
                setShowPasswordModal(false);
            }
        };

        validateToken();
    }, []);

    const handleValidate = (newToken) => {
        setToken(newToken);
        setShowPasswordModal(false);
        setIsTokenValid(true);
        localStorage.setItem('chatToken', newToken);
    };

    return {
        token,
        isTokenValid,
        showPasswordModal,
        setShowPasswordModal,
        handleValidate
    };
}
