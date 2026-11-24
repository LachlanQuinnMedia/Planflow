import sys, json
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); flakes = json.load(open(sys.argv[2]))
near = lambda a, b, tol=14: all(abs(x - y) <= tol for x, y in zip(a, b))
seen = hidden = wrong = 0
for f in flakes:
    px = im.getpixel((int(f['x']), int(f['y'])))
    if f['where'] == 'open':
        if near(px, (255, 255, 255), 10): seen += 1      # the white flake shows on the page colour
    else:
        # A flake is pure white. Over a card that is not white, a white pixel would mean the flake is on top.
        card_is_white = near(tuple(f['under']), (255, 255, 255), 6)
        if not card_is_white and near(px, (255, 255, 255), 3): wrong += 1
        else: hidden += 1
print(json.dumps({'open_and_visible': seen, 'behind_cards': hidden, 'showing_through_a_card': wrong, 'total': len(flakes)}))
