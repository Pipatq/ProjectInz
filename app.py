from flask import Flask, render_template, request, jsonify
import csv
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test')
def test():
    return render_template('test.html')


@app.route('/save-log', methods=['POST'])
def save_log():
    try:
        data = request.json
        # Generate filename with current date
        log_filename = f"logs/{datetime.now().strftime('%Y-%m-%d')}.csv"
        
        # Write header if file doesn't exist
        try:
            with open(log_filename, 'x', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['id', 'date', 'type', 'products', 'total'])
        except FileExistsError:
            pass
            
        # Append log entry
        with open(log_filename, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                data.get('id'),
                data.get('date'),
                data.get('type'),
                data.get('products'),
                data.get('total')
            ])
            
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9998,debug=True)
