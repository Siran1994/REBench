# caveman

Talk like smart caveman. Same brain, fewer tokens.

## What it does

Compress model responses to caveman-style prose by dropping articles, filler, pleasantries, and hedging. Instruction preserves technical detail, code blocks, error strings, and symbols.

Six intensity levels:

| Level | What change |
|-------|-------------|
| `lite` | Drop filler/hedging. Sentences stay full. Professional but tight. |
| `full` | Default. Drop articles, fragments OK, short synonyms. |
| `ultra` | Bare fragments. |
| `wenyan-lite` | Classical Chinese register, light compression. |
| `wenyan-full` | Maximum classical compression (文言文). |
| `wenyan-ultra` | Extreme classical compression. |

Auto-clarity rule: caveman drops to normal prose for security warnings, irreversible-action confirmations, multi-step sequences where fragment ambiguity risks misread, and when user repeats a question. Resumes after the clear part.

## How to invoke

```
/caveman              # full mode (default)
/caveman lite         # lighter compression
/caveman ultra        # extreme compression
/caveman wenyan       # classical Chinese
stop caveman          # back to normal prose
```
