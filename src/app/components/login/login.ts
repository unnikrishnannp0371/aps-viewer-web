import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
// export class Login implements OnInit {
export class Login {
  credentials = {
    email: '',
    password: '',
    remember: false
  };

  constructor(private router: Router) { }

  onLogin() {
    // Implement authentication service validation here
    console.log('Form Submitted Data:', this.credentials);

    // Redirect cleanly into authenticated dashboard route
    this.router.navigate(['/marketplace']);
  }

}
