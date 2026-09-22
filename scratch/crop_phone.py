from PIL import Image

img2_path = r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789962077534.png'
im2 = Image.open(img2_path)
# Let's inspect the phone frame bounds
# In the original image (1024 x 540), where is the phone screen?
# Let's save a sample of crops:
# 1. Cabbage area
# 2. Shop area
# 3. Overall screen
print('Original Image 2 size:', im2.size)

# The phone screen is rounded. The top of the phone screen is around y=110, bottom around y=440.
# Left is around x=90, right is around x=930.
# Let's crop x in [80, 940], y in [100, 450]
crop_screen = im2.crop((88, 107, 936, 443))
crop_screen.save(r'd:/Desktop/REBench/scratch/phone_screen_crop.png')
print('Saved phone_screen_crop.png, size:', crop_screen.size)
