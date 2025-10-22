# Font Conversion to WOFF2

## Install
```bash
brew install woff2
```

## Convert TTF to WOFF2
```bash
# Single file
woff2_compress input.ttf

# Batch convert (example)
for file in /path/to/ttf/*.ttf; do
    woff2_compress "$file"
    mv "${file%.ttf}.woff2" "/output/path/$(basename "${file%.ttf}.woff2")"
done
```

## Notes
- Creates `.woff2` in same directory as input
- ~55% compression typical
- No `--help` flag available