import { createDB } from '$lib/server/db';
import { getAuth } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const handleDatabase: Handle = async ({ event, resolve }) => {
	event.locals.db = createDB(event.platform!.env.pebble);

	return resolve(event);
};

const handleAuth: Handle = async ({ event, resolve }) => {
	const auth = getAuth(event.locals.db, event.platform!.env);

	if (event.url.pathname.startsWith('/api/auth')) {
		return auth.handler(event.request);
	}

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return resolve(event);
};

export const handle = sequence(handleDatabase, handleAuth);
