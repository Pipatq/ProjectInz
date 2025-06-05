from flask import Flask, render_template, request, jsonify
import csv
from datetime import datetime
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test')
def test():
    return render_template('test.html')

@app.route('/check')
def check():
    return render_template('testfile.html')

@app.route('/save-log', methods=['POST'])
def save_log():
    try:
        data = request.json
        
        # Define the log file path
        log_filename = os.path.join('static', 'log.csv')
        
        # Check if file exists to write header
        file_exists = os.path.isfile(log_filename)
        
        with open(log_filename, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Write header if file doesn't exist
            if not file_exists:
                writer.writerow(['id', 'fname', 'lname', 'date', 'type', 'products', 'total'])
            
            # Write the log entry
            writer.writerow([
                data.get('id'),
                data.get('fname'),
                data.get('lname'),
                data.get('date'),
                data.get('type'),
                data.get('products'),
                data.get('total')
            ])
            
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Create static directory if it doesn't exist
    if not os.path.exists('static'):
        os.makedirs('static')
    app.run(host='0.0.0.0', port=9998, debug=True)