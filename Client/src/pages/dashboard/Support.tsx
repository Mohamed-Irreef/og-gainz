// OG GAINZ - Support & Help Center
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  HelpCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Utensils,
  CreditCard,
  Truck,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUser } from "@/context/UserContext";
import { businessContact } from "@/config/contact";

const faqs = [
  {
    category: "Orders & Delivery",
    icon: Truck,
    questions: [
      {
        q: "What are the delivery timings?",
        a: "We deliver fresh meals between 11:00 AM - 2:00 PM daily. You'll receive a notification when your meal is out for delivery."
      },
      {
        q: "Can I skip a delivery?",
        a: "Yes! You can skip any upcoming delivery before the 6:00 AM cutoff on the delivery day. Skipped meals are credited back to your wallet."
      },
      {
        q: "What if I'm not available to receive my delivery?",
        a: "Please ensure someone is available at your delivery address. Our delivery partners will attempt to call you. Undelivered meals cannot be refunded."
      }
    ]
  },
  {
    category: "Subscriptions",
    icon: Calendar,
    questions: [
      {
        q: "How do I pause my subscription?",
        a: "Go to Subscriptions → Select your active plan → Click 'Pause Subscription'. Your pause request may require admin approval for extended durations."
      },
      {
        q: "Can I upgrade my meal pack?",
        a: "Absolutely! Contact our support team via WhatsApp to upgrade your plan. The price difference will be adjusted in your next billing cycle."
      },
      {
        q: "What happens to unused meals when my subscription ends?",
        a: "Any remaining meals are credited to your wallet as OZ Credits, which can be used for future purchases."
      }
    ]
  },
  {
    category: "Payments & Wallet",
    icon: CreditCard,
    questions: [
      {
        q: "How do wallet credits work?",
        a: "Wallet credits can be used for any purchase on OG GAINZ. Credits are earned through referrals, skipped meals, and promotional offers. Note: Credits cannot be withdrawn as cash."
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept all major UPI apps (GPay, PhonePe, Paytm), credit/debit cards, and net banking. All payments are secured with 256-bit encryption."
      },
      {
        q: "How do refunds work?",
        a: "Refunds for valid claims are processed as wallet credits within 24-48 hours. For payment failures, refunds are automatically initiated to your original payment method within 5-7 business days."
      }
    ]
  },
  {
    category: "Meals & Nutrition",
    icon: Utensils,
    questions: [
      {
        q: "How is the protein content calculated?",
        a: "Our nutritionists carefully measure and verify protein content for every meal. The values shown are accurate within ±5g based on portion sizes."
      },
      {
        q: "Can I customize my meals?",
        a: "Yes! During checkout, you can specify preferences like gravy level, spice preference, and rice type. For dietary restrictions, please contact support."
      },
      {
        q: "Are meals fresh or frozen?",
        a: "All OG GAINZ meals are freshly prepared the same day and delivered hot. We never use frozen ingredients or pre-cooked meals."
      }
    ]
  }
];

const Support = () => {
  const { user } = useUser();

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Hi OG GAINZ! I need help with my account.\n\nName: ${user?.name || 'User'}\nEmail: ${user?.email || 'N/A'}`
    );
    window.open(`https://wa.me/${businessContact.phoneDigits}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Contact */}
      <Card className="bg-gradient-to-r from-oz-primary to-oz-secondary text-white overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Need Help? We're Here!</h2>
              <p className="text-white/80 text-sm">
                Our support team is available Monday to Saturday, 9 AM - 9 PM
              </p>
            </div>
            <Button 
              onClick={handleWhatsAppContact}
              className="bg-green-500 hover:bg-green-600 text-white gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              Chat on WhatsApp
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-oz-secondary transition-colors">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-medium mb-1">WhatsApp</h4>
            <p className="text-sm text-muted-foreground mb-3">Fastest response</p>
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              ~5 min response
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:border-oz-secondary transition-colors">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="font-medium mb-1">Call Us</h4>
            <a
              href={businessContact.phoneHref}
              className="text-sm font-semibold text-oz-primary hover:underline block mb-3"
            >
              {businessContact.phone}
            </a>
            <Badge variant="outline" className="text-xs">
              9 AM - 9 PM
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:border-oz-secondary transition-colors">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-oz-accent/10 flex items-center justify-center mx-auto mb-3">
              <Mail className="h-6 w-6 text-oz-accent" />
            </div>
            <h4 className="font-medium mb-1">Email</h4>
            <a
              href={businessContact.emailHref}
              className="text-sm font-semibold text-oz-primary hover:underline block mb-3"
            >
              {businessContact.email}
            </a>
            <Badge variant="outline" className="text-xs">
              24-48 hrs response
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-oz-neutral/40 border-dashed">
        <CardContent className="pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="font-medium mb-2">Visit Us</h4>
            <address className="text-sm text-muted-foreground not-italic whitespace-pre-line leading-relaxed">
              {businessContact.addressLines.join('\n')}
            </address>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button asChild className="flex-1">
              <a href={businessContact.phoneHref}>{businessContact.phone}</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1"
            >
              <a href={businessContact.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                {businessContact.googleMapsLabel}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-oz-secondary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-between h-auto py-3"
            onClick={handleWhatsAppContact}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-oz-accent" />
              <div className="text-left">
                <p className="font-medium">Report a delivery issue</p>
                <p className="text-xs text-muted-foreground">Missing meal, late delivery, quality concern</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-between h-auto py-3"
            onClick={handleWhatsAppContact}
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-oz-secondary" />
              <div className="text-left">
                <p className="font-medium">Request subscription change</p>
                <p className="text-xs text-muted-foreground">Upgrade, pause, or modify your plan</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-between h-auto py-3"
            onClick={handleWhatsAppContact}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Payment or refund query</p>
                <p className="text-xs text-muted-foreground">Failed payment, pending refund, billing</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {faqs.map((category) => (
            <div key={category.category} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <category.icon className="h-5 w-5 text-oz-secondary" />
                <h4 className="font-medium">{category.category}</h4>
              </div>
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((faq, idx) => (
                  <AccordionItem key={idx} value={`${category.category}-${idx}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-sm text-left hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trust Footer */}
      <Card className="bg-oz-neutral/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-oz-secondary flex-shrink-0" />
            <p>
              <strong className="text-foreground">Your satisfaction is our priority.</strong> If you're not happy with your meal, we'll make it right. No questions asked.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
