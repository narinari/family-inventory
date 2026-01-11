{
  description = "A basic flake with a shell";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.systems.follows = "systems";
    };
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs = {
        nixpkgs.follows = "nixpkgs";
      };
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      git-hooks,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
          };
        };
      in
      {
        checks.pre-commit-check = git-hooks.lib.${system}.run {
          src = pkgs.lib.cleanSource ./.;
          hooks = {
            actionlint.enable = true;
            nixfmt-rfc-style = {
              enable = true;
            };
            shellcheck.enable = true;
            shfmt = {
              enable = true;
            };
            statix = {
              enable = true;
            };
            # stylua.enable = true;
            git-secrets = {
              enable = true;
              name = "Git Secrets";
              description = "git-secrets scans commits, commit messages, and --no-ff merges to prevent adding secrets into your git repositories.";
              entry = "${pkgs.git-secrets}/bin/git-secrets --pre_commit_hook";
              language = "script";
            };
            project-linter = {
              enable = true;
              name = "project linter";
              entry = "pnpm lint";
              files = "\\.(ts|tsx)$";
              pass_filenames = false;
            };
            project-type-checker = {
              enable = true;
              name = "project type-checker";
              entry = "pnpm type-check";
              files = "\\.(ts|tsx)$";
              pass_filenames = false;
            };
          };

        };
        devShells.default =
          let
            inherit (self.checks.${system}.pre-commit-check) shellHook enabledPackages;
          in
          pkgs.mkShell {
            packages = with pkgs; [
              bashInteractive
              google-cloud-sdk
              pnpm
              claude-code
              gh
              jdk # for Firebase Emulator
            ];
            inherit shellHook;
            buildInputs = enabledPackages;
          };
        formatter = pkgs.nixfmt-tree;
      }
    );
}
