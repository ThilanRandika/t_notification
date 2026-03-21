class EmailService {
  _printHeader(title) {
    console.log('\n======================================================');
    console.log(`✉️  NEW EMAIL INTERCEPTED - Beddings.lk Notification`);
    console.log(`======================================================`);
    console.log(`SUBJECT: ${title}`);
  }

  _printFooter() {
    console.log(`\nThanks for choosing Beddings.lk - Sleep Better!`);
    console.log(`======================================================\n`);
  }

  async sendWelcome(email, name) {
    this._printHeader('Welcome to Beddings.lk!');
    console.log(`TO: ${email}`);
    console.log(`\nHi ${name},`);
    console.log(`\nWelcome to Beddings.lk! We are thrilled to have you here.`);
    console.log(`Explore our premium luxury silk pillowcases and ultra-soft bedsheets.`);
    this._printFooter();
    return Promise.resolve(true);
  }

  async sendOrderPlaced(orderId, userEmail, totalAmount, items, shippingAddress) {
    this._printHeader(`Your Beddings.lk Order #${orderId} is Confirmed!`);
    console.log(`TO: ${userEmail}`);
    console.log(`\nGreat news! We've received your order and are getting it ready.`);
    console.log(`\n--- Order Details ---`);
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        console.log(`- ${item.quantity}x ${item.productName} @ LKR ${item.price}`);
      });
    }
    console.log(`\nTotal Amount: LKR ${totalAmount}`);
    console.log(`\nShipping To:`);
    if (shippingAddress) {
      console.log(`${shippingAddress.street || ''}, ${shippingAddress.city || ''}, ${shippingAddress.country || ''}`);
    }
    this._printFooter();
    return Promise.resolve(true);
  }

  async sendOrderStatus(orderId, userEmail, status) {
    this._printHeader(`Update on your Beddings.lk Order #${orderId}`);
    console.log(`TO: ${userEmail}`);
    console.log(`\nYour order status has been updated to: [ ${status.toUpperCase()} ]`);
    if (status.toLowerCase() === 'shipped') {
      console.log(`Your premium bedding is on its way to you! Expect it soon.`);
    }
    this._printFooter();
    return Promise.resolve(true);
  }
}

module.exports = new EmailService();
