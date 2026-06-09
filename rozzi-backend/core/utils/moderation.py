import re
import io
import requests
from PIL import Image

# List of common profanities for exact matching
PROFANITIES = {
    # English
    'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'shit', 'shitting', 'shitted', 'shits',
    'bitch', 'bitches', 'bitching', 'asshole', 'assholes', 'bastard', 'bastards', 'cunt', 'cunts',
    'dick', 'dicks', 'pussy', 'pussies', 'porn', 'naked', 'nude', 'nudes', 'sex',
    # Hindi/Hinglish
    'chutiya', 'chutiyas', 'chutiye', 'bhenchod', 'bhenchods', 'behanchod', 'behanchods',
    'madarchod', 'madarchods', 'gandu', 'gandus', 'harami', 'haramis', 'sala', 'saala',
    'saale', 'saali', 'randi', 'randis', 'bhosdike', 'bhosdika', 'loda', 'lauda', 'laudas',
    'kamine', 'kamina'
}

# Substring profanities (length >= 4) to catch compound words (e.g. chutiyapa)
# while avoiding false positives on short letter combinations
SUBSTRING_PROFANITIES = {
    'fuck', 'bitch', 'cunt', 'pussy', 'chutiya', 'bhenchod', 'behanchod',
    'madarchod', 'gandu', 'harami', 'randi', 'bhosdike', 'lauda'
}

# Leetspeak character mapping for normalization (multi-value)
LEET_MAP_MULTI = {
    '4': ['a'], '@': ['a', 'u', 'o'],
    '3': ['e'],
    '1': ['i', 'l'], '!': ['i', 'l', 't'], '|': ['i', 'l'],
    '0': ['o'],
    '5': ['s'], '$': ['s'],
    '7': ['t'],
    '8': ['b'],
    '9': ['g'],
}

def get_normalized_words(word):
    """Generate all possible normalized leetspeak variations of a word"""
    word = word.lower()
    results = [""]
    for char in word:
        mappings = LEET_MAP_MULTI.get(char, [char])
        new_results = []
        for r in results:
            for m in mappings:
                new_results.append(r + m)
        results = new_results
        # Safeguard to prevent combinatorial explosion
        if len(results) > 64:
            results = results[:64]
    return results

def is_profane(word):
    """Check if a single word is profane after normalization"""
    for norm in get_normalized_words(word):
        if norm in PROFANITIES:
            return True
        for bad in SUBSTRING_PROFANITIES:
            if bad in norm:
                return True
    return False

def censor_text(text):
    """
    Censor profane words in a text string.
    Replaces matched words with asterisks of the same length.
    """
    if not isinstance(text, str) or not text:
        return text

    # First, handle common multi-word phrases with spaces/punctuation
    phrases = [
        (r'\bbhen\s+chod\b', '*********'),
        (r'\bbehan\s+chod\b', '**********'),
        (r'\bmadar\s+chod\b', '**********'),
        (r'\bbahen\s+chod\b', '**********'),
        (r'\bma\s+ki\s+chod\b', '**********'),
        (r'\bma\s+ki\s+bhen\b', '**********'),
    ]
    for pattern, replacement in phrases:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    # Tokenize words, treating alphanumeric and common leetspeak characters as parts of a word
    def replace_word(match):
        orig_word = match.group(0)
        # Strip trailing exclamation marks which are punctuation
        m = re.match(r'^(.*?)(!+)$', orig_word)
        if m:
            core, suffix = m.groups()
            if is_profane(core):
                return '*' * len(core) + suffix
            if is_profane(orig_word):
                return '*' * len(orig_word)
            return orig_word
        else:
            if is_profane(orig_word):
                return '*' * len(orig_word)
            return orig_word

    # Match contiguous blocks of word characters plus leet characters
    text = re.sub(r'[a-zA-Z0-9@!$|]+', replace_word, text)
    return text

def check_skin_tone_ratio(image_bytes):
    """
    Analyzes image bytes for skin-like pixel percentage using the RGB skin color model.
    Peer et al. Skin Color Detection Heuristics.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert('RGB')
        # Resize to speed up calculation
        img.thumbnail((120, 120))
        
        width, height = img.size
        total_pixels = width * height
        skin_pixels = 0
        
        for y in range(height):
            for x in range(width):
                r, g, b = img.getpixel((x, y))
                # Peer et al. heuristics:
                # Daylight skin tone:
                if (r > 95 and g > 40 and b > 20 and 
                    (max(r, g, b) - min(r, g, b)) > 15 and 
                    abs(r - g) > 15 and r > g and r > b):
                    skin_pixels += 1
                # Flashlight or lateral daylight:
                elif (r > 220 and g > 210 and b > 170 and 
                      abs(r - g) <= 15 and r > b and g > b):
                    skin_pixels += 1
                    
        ratio = skin_pixels / total_pixels
        return ratio
    except Exception as e:
        print(f"[MODERATION] Error in skin tone check: {e}")
        return 0.0

def moderate_image(image_bytes):
    """
    Moderate image bytes.
    Returns: (is_safe: bool, reason: str)
    """
    if not image_bytes:
        return True, "No image bytes provided."
        
    skin_ratio = check_skin_tone_ratio(image_bytes)
    print(f"[MODERATION] Analyzed image. Skin-tone pixel ratio: {skin_ratio:.2%}")
    
    # Reject images with excessive skin-tone density (> 60%)
    if skin_ratio > 0.60:
        return False, f"Image contains excessive skin exposure ({skin_ratio:.1%})."
        
    return True, "Image is safe."

def download_and_moderate_image_url(url):
    """
    Downloads an image URL and runs moderation on it.
    Returns: (is_safe: bool, reason: str)
    """
    if not url:
        return True, "No URL provided."
        
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return moderate_image(response.content)
        else:
            print(f"[MODERATION] Failed to download image from {url}: HTTP {response.status_code}")
    except Exception as e:
        print(f"[MODERATION] Error downloading image from {url}: {e}")
        
    return True, "Unable to verify image safety, allowed by default."
