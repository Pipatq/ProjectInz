import os
import csv
from flask import Flask, render_template, request, jsonify, url_for, send_from_directory

# --- App Setup ---
# Determine the absolute path of the project directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__,
            static_folder=os.path.join(BASE_DIR, 'static'),
            template_folder=os.path.join(BASE_DIR, 'templates'))

# --- File Paths ---
LOG_FILE_PATH = os.path.join(BASE_DIR, 'static', 'log.csv')
ITEMS_FILE_PATH = os.path.join(BASE_DIR, 'static', 'items.csv')

# --- Main Route ---
@app.route('/')
def index():
    """ Serves the main HTML page. """
    return render_template('index.html')

# --- API Route for Saving Data ---
@app.route('/save-log', methods=['POST'])
def save_log():
    """ Receives patient and transaction data and saves it to log.csv. """
    try:
        data = request.json
        
        file_exists = os.path.isfile(LOG_FILE_PATH)
        is_empty = os.path.getsize(LOG_FILE_PATH) == 0 if file_exists else True
        
        with open(LOG_FILE_PATH, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            headers = [
                'id', 'fname', 'lname', 'date', 'type', 'products', 'total',
                'doctor_name', 'consultant', 'hospital_fee', 'deposit_amount',
                'outstanding_balance', 'payment_method', 'review_status',
                'procedure_info', 'patient_age', 'comment'
            ]

            if not file_exists or is_empty:
                writer.writerow(headers)
            
            row_data = [data.get(h, '') for h in headers]
            writer.writerow(row_data)
            
        return jsonify({'status': 'success', 'message': 'Log saved successfully.'})

    except Exception as e:
        app.logger.error(f"Error saving log: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- Route to serve static CSV files ---
# This is necessary because Flask by default doesn't serve .csv from the static folder.
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

# --- Main Execution for Development ---
if __name__ == '__main__':
    # This block is for running the app directly for testing.
    # In a production XAMPP setup, Apache will handle running the app.
    app.run()

