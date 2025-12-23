import { createDB } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const handleDatabase: Handle = async ({ event, resolve }) => {
	if (!event.platform?.env?.pebble) {
		console.error('D1 database binding not found');
		return new Response('Database configuration error', { status: 500 });
	}
	event.locals.db = createDB(event.platform.env.pebble);
	return resolve(event);
};

const handleAuth: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (path.startsWith('/_app/') || path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
		return resolve(event);
	}

	let auth = getAuth(event.locals.db, event.platform!.env);

	// Handle Better Auth API routes
	if (path.startsWith('/api/auth')) {
		try {
			return await auth.handler(event.request);
		} catch (error) {
			console.error('Auth handler error:', error);
			return new Response('Authentication error', { status: 500 });
		}
	}

	try {
		const session = await auth.api.getSession({
			headers: event.request.headers
		});

		event.locals.session = session?.session ?? null;
		event.locals.user = session?.user ?? null;
	} catch (error) {
		console.error('Failed to get session:', error);
		event.locals.session = null;
		event.locals.user = null;
	}

	const isLoggedIn = !!event.locals.user;
	const publicRoutes = ['/login'];
	const isPublicRoute = publicRoutes.includes(path);

	if (isLoggedIn && path === '/login') {
		throw redirect(303, '/home');
	}

	if (!isLoggedIn && !isPublicRoute) {
		throw redirect(303, '/login');
	}

	return resolve(event);
};

export const handle = sequence(handleDatabase, handleAuth);
