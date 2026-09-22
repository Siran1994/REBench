from PIL import Image

im1 = Image.open(r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789962046776.png')
# Crop right frame: x in [450, 700], y in [0, 366]
crop1 = im1.crop((450, 0, 700, 366))
crop1.save(r'd:/Desktop/REBench/scratch/img1_right_frame.png')
print('Saved img1_right_frame.png')

# Now let's crop the right frame from Image 2:
im2 = Image.open(r'C:/Users/CY/.gemini/antigravity-ide/brain/5b0b8ca5-e1bd-4b25-8eaa-866dc25bad99/.user_uploaded/media_1789962077534.png')
# In Image 2, the phone screen has the right frame
crop2 = im2.crop((650, 50, 950, 480))
crop2.save(r'd:/Desktop/REBench/scratch/img2_right_frame.png')
print('Saved img2_right_frame.png')
