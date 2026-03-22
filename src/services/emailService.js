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

  _printToConsole(email, subject, bodyChunks) {
    this._printHeader(subject);
    console.log(`TO: ${email}`);
    bodyChunks.forEach(chunk => console.log(chunk));
    this._printFooter();
  }

  async generateWelcome(email, name) {
    const subject = 'Welcome to Beddings.lk!';
    const bodyChunks = [
      `\nHi ${name},`,
      `\nWelcome to Beddings.lk! We are thrilled to have you here.`,
      `Explore our premium luxury silk pillowcases and ultra-soft bedsheets.`
    ];
    this._printToConsole(email, subject, bodyChunks);
    return { subject, body: bodyChunks.join('\n') };
  }

  async generateOrderPlaced(orderId, userEmail, totalAmount, items, shippingAddress) {
    const subject = `Your Beddings.lk Order #${orderId} is Confirmed!`;
    const bodyChunks = [
      `\nGreat news! We've received your order and are getting it ready.`,
      `\n--- Order Details ---`
    ];
    
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        bodyChunks.push(`- ${item.quantity}x ${item.productName} @ LKR ${item.price}`);
      });
    }
    
    bodyChunks.push(`\nTotal Amount: LKR ${totalAmount}`);
    bodyChunks.push(`\nShipping To:`);
    if (shippingAddress) {
      bodyChunks.push(`${shippingAddress.street || ''}, ${shippingAddress.city || ''}, ${shippingAddress.country || ''}`);
    }
    
    this._printToConsole(userEmail, subject, bodyChunks);
    return { subject, body: bodyChunks.join('\n') };
  }

  async generateOrderStatus(orderId, userEmail, status) {
    const subject = `Update on your Beddings.lk Order #${orderId}`;
    const bodyChunks = [
      `\nYour order status has been updated to: [ ${status.toUpperCase()} ]`
    ];
    if (status.toLowerCase() === 'shipped') {
      bodyChunks.push(`Your premium bedding is on its way to you! Expect it soon.`);
    }
    
    this._printToConsole(userEmail, subject, bodyChunks);
    return { subject, body: bodyChunks.join('\n') };
  }
}

module.exports = new EmailService();
