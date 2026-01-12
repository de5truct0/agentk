# Homebrew Formula for AGENT-K
# Multi-Agent Claude Code Terminal Suite

class Agentk < Formula
  desc "Multi-Agent Claude Code Terminal Suite"
  homepage "https://github.com/de5truct0/agentk"
  url "https://github.com/de5truct0/agentk/archive/refs/tags/v1.0.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256"  # Update this after creating release
  license "MIT"
  head "https://github.com/de5truct0/agentk.git", branch: "main"

  depends_on "bash" => ">= 4.0"
  depends_on "jq"

  # Claude Code CLI is required but not in Homebrew
  # Users must install it separately

  def install
    # Install main script
    bin.install "agentk/agentk"

    # Install library files
    (libexec/"lib").install Dir["agentk/lib/*"]

    # Install mode configurations
    (libexec/"modes").install Dir["agentk/modes/*"]

    # Create wrapper that sets AGENTK_ROOT
    (bin/"agentk").unlink
    (bin/"agentk").write <<~EOS
      #!/usr/bin/env bash
      export AGENTK_ROOT="#{libexec}"
      exec "#{libexec}/agentk" "$@"
    EOS
    (bin/"agentk").chmod 0755

    # Install the actual agentk script to libexec
    libexec.install "agentk/agentk"
  end

  def caveats
    <<~EOS
      AGENT-K requires Claude Code CLI to be installed.
      Install it from: https://claude.ai/code

      To verify installation:
        agentk --version

      To get started:
        agentk              # Start dev mode
        agentk --mode ml    # Start ML mode
        agentk --help       # Show all options

      Optional: Install tmux for visual mode:
        brew install tmux
    EOS
  end

  test do
    assert_match "AGENT-K v", shell_output("#{bin}/agentk --version")
  end
end
