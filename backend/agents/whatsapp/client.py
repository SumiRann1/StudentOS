import os
import sys
import time
import atexit
from playwright.sync_api import sync_playwright, Page
class WhatsAppClient:
    _instance = None
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(WhatsAppClient, cls).__new__(cls, *args, **kwargs)
            cls._instance.initialized = False
            cls._instance.playwright = None
            cls._instance.browser_context = None
            cls._instance.page = None
        return cls._instance
    def initialize(self):
        if self.initialized:
            try:
                if self.page and not self.page.is_closed():
                    return
            except Exception:
                pass
            self.close()
        
        print("Starting Playwright and launching WhatsApp Web...")
        self.playwright = sync_playwright().start()
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        user_data_dir = os.path.join(current_dir, "../../../data/whatsapp_session")
        os.makedirs(user_data_dir, exist_ok=True)
        
        headless_env = os.getenv("WHATSAPP_HEADLESS")
        if headless_env is not None:
            headless = headless_env.lower() == "true"
        else:
            headless = False
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        try:
            self.browser_context = self.playwright.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=headless,
                slow_mo=50,
                user_agent=user_agent,
                viewport={"width": 1280, "height": 800},
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-gpu",
                    "--disable-dev-shm-usage"
                ]
            )
        except Exception as launch_err:
            print(f"Failed to launch Chromium context: {launch_err}. Attempting to install Playwright Chromium dependencies...")
            import subprocess
            try:
                subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
                self.browser_context = self.playwright.chromium.launch_persistent_context(
                    user_data_dir=user_data_dir,
                    headless=headless,
                    slow_mo=50,
                    user_agent=user_agent,
                    viewport={"width": 1280, "height": 800},
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-gpu",
                        "--disable-dev-shm-usage"
                    ]
                )
            except Exception as retry_err:
                print(f"Failed to install or launch chromium on retry: {retry_err}")
                raise launch_err
        
        self.browser_context.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined })")
        
        self.page = self.browser_context.pages[0] if self.browser_context.pages else self.browser_context.new_page()
        try:
            from playwright_stealth import Stealth
            Stealth().apply_stealth_sync(self.page)
        except Exception as stealth_err:
            print(f"Failed to apply stealth: {stealth_err}")
        self.page.goto("https://web.whatsapp.com")
        
        print("Waiting for WhatsApp Web to load or prompt login...")
        start_time = time.time()
        authenticated = False
        qr_saved = False
        scan_detected = False
        while time.time() - start_time < 120: 
            try:
                logged_in_el = self.page.query_selector(
                    'div[data-testid="chat-list"], div[data-testid="side"], div#pane-side, '
                    'div[contenteditable="true"][data-tab="3"], input[data-testid="chat-list-search"]'
                )
                if logged_in_el:
                    print("WhatsApp Web loaded and authenticated!")
                    authenticated = True
                    qr_path = os.path.join(current_dir, "../../../data/whatsapp_qr.png")
                    if os.path.exists(qr_path):
                        try:
                            os.remove(qr_path)
                        except Exception:
                            pass
                    break
                
                qr_canvas = self.page.query_selector('canvas')
                if qr_canvas:
                    print("QR Code detected. Please scan the QR code in the browser window to log in...")
                    qr_path = os.path.abspath(os.path.join(current_dir, "../../../data/whatsapp_qr.png"))
                    self.page.screenshot(path=qr_path)
                    if not qr_saved:
                        print(f"Saved QR code screenshot to: {qr_path}")
                        qr_saved = True
                else:
                    if qr_saved and not scan_detected:
                        print("QR code scanned. Loading WhatsApp Web dashboard...")
                        scan_detected = True
            except Exception as e:
                print("Browser window was closed or disconnected.")
                break
            
            time.sleep(2)
            
        if not authenticated:
            self.close()
            raise TimeoutError("WhatsApp Web login timed out. Please run again and scan the QR code.")
            
        self.initialized = True
        marker_path = os.path.abspath(os.path.join(current_dir, "../../../data/whatsapp_authenticated.marker"))
        try:
            with open(marker_path, "w") as f:
                f.write("authenticated")
        except Exception:
            pass
    def get_page(self) -> Page:
        self.initialize()
        return self.page
        
    def close(self):
        if self.initialized:
            print("Closing WhatsApp Web browser context...")
            try:
                if self.browser_context:
                    self.browser_context.close()
            except Exception:
                pass
            try:
                if self.playwright:
                    self.playwright.stop()
            except Exception:
                pass
            self.initialized = False
            self.playwright = None
            self.browser_context = None
            self.page = None
atexit.register(lambda: WhatsAppClient().close())
