<div class="flex min-h-screen flex-col lg:flex-row">
	<div
		class="hidden items-center justify-center border-r-2 border-neutral bg-primary p-8 lg:flex lg:w-1/2"
	>
		<div class="flex items-center gap-4">
			<img src="/logo.svg" alt="Pebble Logo" class="h-24 w-24" />
			<h1 class="text-7xl font-bold text-primary-content">Pebble.</h1>
		</div>
	</div>

	<div
		class="flex min-h-screen w-full items-center justify-center bg-primary p-6 lg:w-1/2 lg:bg-base-100"
	>
		<div class="w-full max-w-md space-y-8">
			<div class="flex flex-col items-center justify-center gap-3 text-center lg:hidden">
				<img src="/logo.svg" alt="Pebble Logo" class="h-16 w-16 sm:h-20 sm:w-20" />
				<h1 class="text-5xl font-bold text-primary-content sm:text-6xl">Pebble.</h1>
			</div>

			<div class="card border-2 border-neutral bg-base-100 shadow-xl">
				<div class="card-body p-6 sm:p-8 md:p-10">
					<h2 class="mb-2 text-center text-3xl font-bold text-neutral sm:text-4xl md:text-5xl">
						Welcome!
					</h2>
					<p class="mb-6 text-center text-base text-neutral/80 sm:text-lg md:mb-8">
						Get started with your Google account
					</p>

					<form method="post" action="/api/auth/google" class="w-full">
						<input type="hidden" name="callbackURL" value="/home" />
						<button type="submit" class="btn w-full border-2 border-neutral btn-primary">
							<svg
								class="shrink-0"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M21.5939 11.0792H12.3209V13.8256H18.9768C18.6214 17.6382 15.5196 19.286 12.5148 19.286C8.70223 19.286 5.30969 16.3135 5.30969 12.0162C5.30969 7.88057 8.54068 4.74651 12.5148 4.74651C15.5519 4.74651 17.3936 6.71741 17.3936 6.71741L19.2676 4.74651C19.2676 4.74651 16.7474 2.00016 12.3856 2.00016C6.6344 1.96785 2.24023 6.78203 2.24023 11.9839C2.24023 17.0243 6.37592 22 12.4825 22C17.8783 22 21.7554 18.349 21.7554 12.8886C21.7877 11.7578 21.5939 11.0792 21.5939 11.0792Z"
									fill="currentColor"
								></path>
							</svg>
							<span class="text-base sm:text-lg">Continue with Google</span>
						</button>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>
