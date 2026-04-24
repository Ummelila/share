from PIL import Image

def remove_white_background(image_path, output_path, tolerance=240):
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    for item in data:
        # Check if pixel is white or near white
        if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
            # Change white to transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    remove_white_background("public/logo.png", "public/logo.png")
    print("Background removed.")
