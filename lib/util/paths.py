import os

# Calculate the base directory of the project.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Get the root directory of the project
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Define data paths
DATA_RAW_JSON = os.path.join(ROOT_DIR, 'data', 'raw', 'json')
DATA_RAW_CSV = os.path.join(ROOT_DIR, 'data', 'raw', 'csv')
DATA_PROCESSED = os.path.join(ROOT_DIR, 'data', 'processed')
TEST_DATA_PROCESSED = os.path.join(ROOT_DIR, 'data', 'test')

# Define common paths
# DATA_RAW_JSON = os.path.join(BASE_DIR, "data", "raw", "json")
# DATA_RAW_CSV = os.path.join(BASE_DIR, "data", "raw", "csv")
# DATA_PROCESSED = os.path.join(BASE_DIR, "data", "processed")
# TEST_DATA_PROCESSED = os.path.join(DATA_PROCESSED, "test")
CACHE_DIR = os.path.join(BASE_DIR, "data", "cache")
TEST_CACHE_DIR = os.path.join(CACHE_DIR, "test")

if __name__ == "__main__":
    print(f"Base directory: {BASE_DIR}")
    print(f"Raw JSON data path: {DATA_RAW_JSON}")
    print(f"Raw CSV data path: {DATA_RAW_CSV}")
    print(f"Processed data path: {DATA_PROCESSED}")
    print(f"Processed test data path: {TEST_DATA_PROCESSED}")
    print(f"Cache directory: {CACHE_DIR}")
    print(f"Test Cache directory: {TEST_CACHE_DIR}")
