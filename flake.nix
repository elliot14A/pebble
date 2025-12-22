{
  description = "SvelteKit development environment with Cloudflare Workers and D1";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs_22
            git
            nodePackages.typescript
            nodePackages.typescript-language-server
            nodePackages.svelte-language-server
          ];

          shellHook = ''
            echo "🚀 SvelteKit + Cloudflare Workers + D1 development environment"
            echo "📦 Bun version: $(bun --version)"
            echo "📦 Node version: $(node --version)"

            # Add node_modules/.bin to PATH for local wrangler
            export PATH="$PWD/node_modules/.bin:$PATH"

            # Check if wrangler is installed locally
            if [ -f "$PWD/node_modules/.bin/wrangler" ]; then
              echo "📦 Wrangler version: $(wrangler --version)"
            else
              echo "⚠️  Wrangler not found. Run 'bun install' to install dependencies."
            fi

            echo ""
            echo "Available commands:"
            echo "  bun install          - Install dependencies"
            echo "  bun run dev          - Start development server"
            echo "  wrangler d1 ...      - Manage D1 databases"
            echo "  wrangler deploy      - Deploy to Cloudflare Workers"
          '';
        };
      }
    );
}
