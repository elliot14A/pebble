// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { createDB } from '$lib/server/db';

declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			db: ReturnType<typeof createDB>;
			session: Session | null;
			user: User | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
