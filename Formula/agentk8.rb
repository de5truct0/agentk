# Homebrew Formula for AGENT-K
# Multi-Agent Claude Code Terminal Suite

class Agentk8 < Formula
  desc "Multi-Agent Claude Code Terminal Suite"
  homepage "https://github.com/de5truct0/agentk"
  url "https://github.com/de5truct0/agentk/archive/refs/tags/v1.0.0.tar.gz"
  sha256 "0019dfc4b32d63c1392aa264aed2253c1e0c2fb09216f8e2cc269bbfb8bb49b5"
  license "MIT"
  head "https://github.com/de5truct0/agentk.git", branch: "main"

  depends_on "bash" => ">= 4.0"
  depends_on "jq"

  # Claude Code CLI is required but not in Homebrew
  # Users must install it separately

  def install
    # Install library files to libexec
    (libexec/"lib").install Dir["lib/*"]
    (libexec/"modes").install Dir["modes/*"]

    # Install main script to libexec
    libexec.install "agentk"

    # Create wrapper that sets AGENTK_ROOT
    (bin/"agentk").write <<~EOS
      #!/usr/bin/env bash
      export AGENTK_ROOT="#{libexec}"
      exec "#{libexec}/agentk" "$@"
    EOS
    (bin/"agentk").chmod 0755
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
