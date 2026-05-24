"""
Input Sanitization Utilities
Prevents prompt injection and other security issues by sanitizing user input.
"""

import re
import urllib.parse


def sanitize_topic(topic: str) -> str:
    """
    Sanitize research topic to prevent prompt injection.
    
    Removes or escapes potentially dangerous patterns while preserving
    legitimate content.
    """
    if not topic:
        return ""
    
    # Remove null bytes
    topic = topic.replace("\x00", "")
    
    # Limit length to prevent DoS
    topic = topic[:500]
    
    # Remove potential prompt injection patterns
    # These are common patterns used in prompt injection attacks
    injection_patterns = [
        r"<\|.*?\|>",  # Special delimiter patterns
        r"###.*?###",  # Markdown delimiter patterns
        r"---.*?---",   # YAML separator patterns
        r"```.*?```",   # Code block patterns
    ]
    
    for pattern in injection_patterns:
        topic = re.sub(pattern, "", topic, flags=re.IGNORECASE | re.DOTALL)
    
    # Strip excessive whitespace
    topic = " ".join(topic.split())
    
    return topic.strip()


def sanitize_depth(depth: str) -> str:
    """
    Validate and sanitize research depth parameter.
    
    Ensures depth is one of the allowed values.
    """
    allowed_depths = ["quick", "standard", "deep"]
    if depth.lower() in allowed_depths:
        return depth.lower()
    return "standard"  # Default fallback


def sanitize_job_id(job_id: str) -> str:
    """
    Validate and sanitize job ID.
    
    Ensures job ID is a valid UUID format.
    """
    # Basic UUID format validation
    uuid_pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    if re.match(uuid_pattern, job_id.lower()):
        return job_id.lower()
    raise ValueError("Invalid job ID format")


def is_safe_url(url: str) -> bool:
    """
    Check if a URL is safe to fetch (prevents SSRF attacks).
    
    Only allows HTTPS URLs from public domains.
    Blocks:
    - file:// URLs
    - http:// URLs (insecure)
    - localhost/127.0.0.1
    - Private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
    - Internal hostnames (.local, .internal, etc.)
    """
    try:
        parsed = urllib.parse.urlparse(url)
        
        # Only allow HTTPS
        if parsed.scheme != "https":
            return False
        
        # Block localhost and private IPs
        hostname = parsed.hostname or ""
        if hostname in ("localhost", "127.0.0.1", "::1"):
            return False
        
        # Block private IP ranges
        if hostname.startswith("10.") or hostname.startswith("192.168."):
            return False
        if hostname.startswith("172."):
            parts = hostname.split(".")
            if len(parts) >= 2 and 16 <= int(parts[1]) <= 31:
                return False
        
        # Block internal TLDs
        if hostname.endswith(".local") or hostname.endswith(".internal"):
            return False
        
        return True
    except Exception:
        return False


class SafeURLFetcher:
    """
    Safe URL fetcher for WeasyPrint.
    Prevents SSRF attacks by validating URLs before fetching.
    """
    
    def fetch(self, url: str):
        """
        Fetch a URL safely.
        
        Raises ValueError if URL is not safe.
        """
        if not is_safe_url(url):
            raise ValueError(f"Unsafe URL blocked: {url}")
        
        # Use WeasyPrint's default fetcher for safe URLs
        from weasyprint import HTML
        return HTML(url=url)
