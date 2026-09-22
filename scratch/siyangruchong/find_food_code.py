import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Search global-metadata.dat and wasm
# Let's inspect Il2CppCodeRegistration
# In v29, global-metadata.dat doesn't have code pointers (they are in wasm/binary)
# But we can find string literals referenced by FoodShop:
# For example, in inspect_target_classes:
# FoodShop has:
# Field 0: availableFoods
# Field 6: deliverySystem
# Method: CanBuy
# Method: BuyFood
# Method: MeetsTableRequirement
# Method: GetMissingTableExpansionLevels

print('Checking FoodShop...')
