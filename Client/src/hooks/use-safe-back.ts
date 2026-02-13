import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useSafeBack = (fallbackPath: string) => {
	const navigate = useNavigate();
	const location = useLocation();

	return useCallback(() => {
		const hasHistory = window.history.length > 1 && location.key !== 'default';
		if (hasHistory) {
			navigate(-1);
			return;
		}
		navigate(fallbackPath, { replace: true });
	}, [fallbackPath, navigate, location.key]);
};
